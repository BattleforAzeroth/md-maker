(function () {
  "use strict";

  var USERS = {
    "maker-one": "chiikawa0321",
    "maker-two": "hachiware0702"
  };
  var AUTOSAVE_MS = 10000;
  var currentUser = null;
  var activeFileId = null;
  var autosaveTimer = null;

  var loginView = document.getElementById("login-view");
  var workspaceView = document.getElementById("workspace-view");
  var loginForm = document.getElementById("login-form");
  var passwordInput = document.getElementById("password");
  var loginError = document.getElementById("login-error");
  var currentUserLabel = document.getElementById("current-user");
  var saveStatus = document.getElementById("save-status");
  var fileList = document.getElementById("file-list");
  var fileNameInput = document.getElementById("file-name");
  var editor = document.getElementById("editor");
  var wordCount = document.getElementById("word-count");

  function storageKey() { return "md-maker-files:" + currentUser; }
  function userLabel() { return currentUser === "maker-one" ? "用户一" : "用户二"; }
  function readFiles() {
    try {
      var files = JSON.parse(localStorage.getItem(storageKey()) || "[]");
      return Array.isArray(files) ? files : [];
    } catch (error) {
      return [];
    }
  }
  function writeFiles(files) {
    localStorage.setItem(storageKey(), JSON.stringify(files));
    saveStatus.textContent = "已保存 · " + new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  function createFile() {
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2), name: "未命名文档.md", content: "", updatedAt: Date.now() };
  }
  function getActiveFile(files) {
    return files.find(function (file) { return file.id === activeFileId; }) || files[0];
  }
  function renderFileList() {
    var files = readFiles();
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
    var file = getActiveFile(readFiles());
    if (!file) return;
    fileNameInput.value = file.name;
    editor.value = file.content;
    updateCount();
    renderFileList();
    saveStatus.textContent = "已加载";
  }
  function saveActiveFile(showStatus) {
    if (!currentUser || !activeFileId) return;
    var files = readFiles();
    var file = files.find(function (item) { return item.id === activeFileId; });
    if (!file) return;
    file.name = normalizeName(fileNameInput.value);
    file.content = editor.value;
    file.updatedAt = Date.now();
    writeFiles(files);
    renderFileList();
    if (!showStatus) saveStatus.textContent = "自动保存完成";
  }
  function normalizeName(name) {
    var trimmed = name.trim() || "未命名文档";
    return trimmed.toLowerCase().endsWith(".md") ? trimmed : trimmed + ".md";
  }
  function updateCount() {
    wordCount.textContent = editor.value.length.toLocaleString("zh-CN") + " 字符";
  }
  function startAutosave() {
    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(function () { saveActiveFile(false); }, AUTOSAVE_MS);
  }
  function enterWorkspace(username) {
    currentUser = username;
    currentUserLabel.textContent = userLabel();
    loginView.classList.add("hidden");
    workspaceView.classList.remove("hidden");
    var files = readFiles();
    if (!files.length) {
      files = [createFile()];
      localStorage.setItem(storageKey(), JSON.stringify(files));
    }
    activeFileId = files[0].id;
    selectFile(activeFileId);
    startAutosave();
  }
  function downloadActiveFile() {
    saveActiveFile(true);
    var file = getActiveFile(readFiles());
    if (!file) return;
    var blob = new Blob([file.content], { type: "text/markdown;charset=utf-8" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var match = Object.keys(USERS).find(function (username) { return USERS[username] === passwordInput.value; });
    if (!match) {
      loginError.textContent = "密码不正确，请重试。";
      passwordInput.select();
      return;
    }
    loginError.textContent = "";
    passwordInput.value = "";
    enterWorkspace(match);
  });
  document.getElementById("save-button").addEventListener("click", function () { saveActiveFile(true); });
  document.getElementById("download-button").addEventListener("click", downloadActiveFile);
  document.getElementById("new-file-button").addEventListener("click", function () {
    saveActiveFile(true);
    var files = readFiles();
    var file = createFile();
    files.unshift(file);
    writeFiles(files);
    selectFile(file.id);
    fileNameInput.focus();
    fileNameInput.select();
  });
  document.getElementById("delete-button").addEventListener("click", function () {
    var files = readFiles();
    if (files.length <= 1) {
      alert("至少保留一个文件。");
      return;
    }
    if (!window.confirm("确定删除当前文件吗？")) return;
    var remaining = files.filter(function (file) { return file.id !== activeFileId; });
    writeFiles(remaining);
    activeFileId = remaining[0].id;
    selectFile(activeFileId);
  });
  document.getElementById("logout-button").addEventListener("click", function () {
    saveActiveFile(true);
    clearInterval(autosaveTimer);
    currentUser = null;
    activeFileId = null;
    workspaceView.classList.add("hidden");
    loginView.classList.remove("hidden");
  });
  fileNameInput.addEventListener("change", function () { fileNameInput.value = normalizeName(fileNameInput.value); saveActiveFile(true); });
  editor.addEventListener("input", updateCount);
  window.addEventListener("beforeunload", function () { saveActiveFile(true); });
})();
