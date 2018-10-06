let store = new IdbKvStore(USER_DB);
store.keys(function (error, value) {
    if (value.length > 0) {
        window.open(chrome.extension.getURL('index.html'), '_self');
    }
});