var unaadhar = Object();
unaadhar.version = "0.1";
unaadhar.promise = new Promise(function doIt(resolve, reject) {
    if (!(typeof recv_user_data === 'undefined')) {
        console.log(recv_user_data);
        resolve(recv_user_data);
    }
    else {
        setTimeout(doIt, 100, resolve, reject);
    }
});

unaadhar.verify = async function (requiredDetails) {
    let data = { verify: requiredDetails, h: window.outerWidth, w: window.outerHeight };
    chrome.runtime.sendMessage(extensionId, data);
    return unaadhar.promise;
};