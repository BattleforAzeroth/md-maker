(function () {
  "use strict";

  var LEGACY_USERS = {
    "maker-one": "chiikawa0321",
    "maker-two": "hachiware0702"
  };
  var AUTOSAVE_MS = 10000;
  var currentUser = null;
  var activeFileId = null;
  var files = [];
  var autosaveTimer = null;
  var cloudEnabled = Boolean(window.MD_MAKER_CONFIG && window.MD_MAKER_CONFIG.url && window.MD_MAKER_CONFIG.anonKey && window.supabase);
  var supabaseClient = cloudEnabled
    ? window.supabase.createClient(window.MD_MAKER_CONFIG.url, window.MD_MAKER_CONFIG.anonKey)
    : null;

  var loginView = document.getElementById("login-view");
  var workspaceView = document.getElementById("workspace-view");
  var loginForm = document.getElementById("login-form");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var loginError = document.getElementById("login-error");
  var storageNote = document.getElementById("storage-note");
  var currentUserLabel = document.getElementById("current-user");
  var saveStatus = document.getElementById("save-status");
  var fileList = document.getElementById("file-list");
  var fileNameInput = document.getElementById("file-name");
  var editor = document.getElementById("editor");
  var wordCount = document.getElementById("word-count");

  storageNote.textContent = cloudEnabled
    ? "文档会自动同步到 Supabase 云端。"
    : "未配置云端：文档暂时保存在当前浏览器。";

  function localStorageKey() {
    return "md-maker-files:" + (currentUser ? currentUser.id : "legacy");
  }
  function userLabel() {
    return currentUser && currentUser.email ? currentUser.email : currentUser.name;
  }
  function normalizeName(name) {
    var trimmed = name.trim() || "未命名文档";
    return trimmed.toLowerCase().endsWith(".md") ? trimmed : trimmed + ".md";
  }
  function updateCount() {
    wordCount.textContent = editor.value.length.toLocaleString("zh-CN") + " 字符";
  }
  function createFile() {
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      name: "未命名文档.md",
      content: "",
      updatedAt: Date.now()
    };
  }
  function getActiveFile() {
    return files.find(function (file) { return file.id === activeFileId; }) || files[0];
  }
  function readLocalFiles() {
    try {
      var stored = JSON.parse(localStorage.getItem(localStorageKey()) || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch (error) {
      return [];
    }
  }
  function writeLocalFiles() {
    localStorage.setItem(localStorageKey(), JSON.stringify(files));
  }
  function renderFileList() {
    fileList.innerHTML = "";
    files.forEach(function (file) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "file-item" + (file.id === activeFileId ? " active" : "");
      button.innerHTML = '<span class="file-item-name"></span><span class="file-item-dot" aria-hidden="true"></span>';
      button.querySelector(".file-item-name").textContent = file.name;
      button.addEventListener("click", function () { selectFile(file.id); });
      fileList.appendChild(button);
    });
  }
  function selectFile(fileId) {
    activeFileId = fileId;
    var file = getActiveFile();
    if (!file) return;
    fileNameInput.value = file.name;
    editor.value = file.content;
    updateCount();
    renderFileList();
    saveStatus.textContent = "已加载";
  }
  function localSave() {
    var file = getActiveFile();
    if (!file) return;
    file.name = normalizeName(fileNameInput.value);
    file.content = editor.value;
    file.updatedAt = Date.now();
    writeLocalFiles();
  }
  async function cloudSave(file) {
    if (!cloudEnabled || !file) return;
    var result = await supabaseClient
      .from("documents")
      .upsert({
        id: file.remoteId || undefined,
        user_id: currentUser.id,
        title: file.name,
        content: file.content,
        updated_at: new Date(file.updatedAt).toISOString()
      })
      .select()
      .single();
    if (result.error) throw result.error;
    file.remoteId = result.data.id;
  }
  async function saveActiveFile(showStatus) {
    var file = getActiveFile();
    if (!file) return;
    localSave();
    try {
      await cloudSave(file);
      saveStatus.textContent = (showStatus ? "已保存" : "自动保存完成") + " · 云端";
    } catch (error) {
      saveStatus.textContent = "本地已保存，云端同步失败";
      console.error("Document save failed:", error);
      return;
    }
    renderFileList();
  }
  async function loadCloudFiles() {
    var result = await supabaseClient
      .from("documents")
      .select("id,title,content,updated_at")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false });
    if (result.error) throw result.error;
    files = result.data.map(function (file) {
      return { id: file.id, remoteId: file.id, name: file.title, content: file.content, updatedAt: Date.parse(file.updated_at) };
    });
    if (!files.length) {
      files = [createFile()];
      await cloudSave(files[0]);
    }
    writeLocalFiles();
  }
  function loadLocalFiles() {
    files = readLocalFiles();
    if (!files.length) {
      files = [createFile()];
      writeLocalFiles();
    }
  }
  async function enterWorkspace(user) {
    currentUser = user;
    currentUserLabel.textContent = userLabel();
    loginView.classList.add("hidden");
    workspaceView.classList.remove("hidden");
    try {
      if (cloudEnabled) await loadCloudFiles();
      else loadLocalFiles();
      activeFileId = files[0].id;
      selectFile(activeFileId);
      clearInterval(autosaveTimer);
      autosaveTimer = setInterval(function () { saveActiveFile(false); }, AUTOSAVE_MS);
    } catch (error) {
      loginError.textContent = "云端数据加载失败，请检查 Supabase 配置。";
      console.error("Workspace load failed:", error);
      workspaceView.classList.add("hidden");
      loginView.classList.remove("hidden");
    }
  }
  async function login(email, password) {
    if (!cloudEnabled) {
      var legacyUser = Object.keys(LEGACY_USERS).find(function (name) { return LEGACY_USERS[name] === password; });
      if (!legacyUser) throw new Error("账号或密码错误");
      return { id: legacyUser, name: legacyUser, email: email };
    }
    var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    return result.data.user;
  }
  async function logout() {
    await saveActiveFile(true);
    clearInterval(autosaveTimer);
    if (cloudEnabled) await supabaseClient.auth.signOut();
    currentUser = null;
    activeFileId = null;
    files = [];
    workspaceView.classList.add("hidden");
    loginView.classList.remove("hidden");
  }
  function downloadActiveFile() {
    var file = getActiveFile();
    if (!file) return;
    var blob = new Blob([editor.value], { type: "text/markdown;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = normalizeName(fileNameInput.value);
    link.click();
    URL.revokeObjectURL(link.href);
  }

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    loginError.textContent = "";
    try {
      await enterWorkspace(await login(emailInput.value.trim(), passwordInput.value));
      passwordInput.value = "";
    } catch (error) {
      loginError.textContent = "账号或密码错误，请重试。";
      passwordInput.select();
    }
  });
  document.getElementById("save-button").addEventListener("click", function () { saveActiveFile(true); });
  document.getElementById("download-button").addEventListener("click", downloadActiveFile);
  document.getElementById("new-file-button").addEventListener("click", async function () {
    await saveActiveFile(true);
    var file = createFile();
    files.unshift(file);
    activeFileId = file.id;
    await saveActiveFile(true);
    selectFile(file.id);
    fileNameInput.focus();
    fileNameInput.select();
  });
  document.getElementById("delete-button").addEventListener("click", async function () {
    if (files.length <= 1) {
      alert("至少保留一个文件。");
      return;
    }
    if (!window.confirm("确定删除当前文件吗？")) return;
    var file = getActiveFile();
    if (cloudEnabled && file.remoteId) {
      var result = await supabaseClient.from("documents").delete().eq("id", file.remoteId);
      if (result.error) {
        saveStatus.textContent = "删除失败";
        return;
      }
    }
    files = files.filter(function (item) { return item.id !== activeFileId; });
    writeLocalFiles();
    activeFileId = files[0].id;
    selectFile(activeFileId);
  });
  document.getElementById("logout-button").addEventListener("click", logout);
  fileNameInput.addEventListener("change", function () {
    fileNameInput.value = normalizeName(fileNameInput.value);
    saveActiveFile(true);
  });
  editor.addEventListener("input", updateCount);
  window.addEventListener("beforeunload", function () { localSave(); });
})();
