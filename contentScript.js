console.log("Injecting Unaadhar!")
var s = document.createElement('script');
s.textContent = "var extensionId = " + JSON.stringify(chrome.runtime.id);
(document.head || document.documentElement).appendChild(s);

s = document.createElement('script');
s.src = chrome.extension.getURL('js/unaadhar.js');
(document.head || document.documentElement).appendChild(s);

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {

    if (request.frombg != undefined) {
        console.log(request);
        var s = document.createElement('script');
        console.log(JSON.stringify(request));
        s.textContent = "if(typeof recv_user_data == undefined){let recv_user_data; } recv_user_data =" + JSON.stringify(request)+";";
        (document.head || document.documentElement).appendChild(s);
    }
});