let video = document.getElementById("videoElement");
let uname;

if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
            video.srcObject = stream;
        })
        .catch(function (error) {
            console.log("Something went wrong!");
        });
}

async function captureImage() {
    let a;
    await navigator.mediaDevices.getUserMedia({ video: true })
        .then(async function (mediaStream) { a = await takePhoto(mediaStream); })
        .catch(error => console.error('getUserMedia() error:', error));
    return a;
}

async function takePhoto(mediaStream) {
    // For taking an image

    const mediaStreamTrack = mediaStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(mediaStreamTrack);


    try {
        let blob = await imageCapture.takePhoto();
        console.log("Took a photo!");
        return blob;
        // display image todo

    } catch (err) {
        console.error('takePhoto() error:', err);


    }
    mediaStream.removeTrack(mediaStreamTrack);
    return undefined;
}

async function identify() {

    //let confidence = await verify();
    $("#videoElement").fadeOut(300).fadeIn(150);
    image = await captureImage();
    $(".video-overlay").text("Processing...");
    $(".video-overlay").show();
    let user = await verify(image);

    uname = await getCurrentUser();
    if (user[1] === uname) {
        if (user[0] > 0.45) {
            let store = new IdbKvStore(USER_DATA_DB);
            let data = await store.get(uname);
            console.log(data);
            store = new IdbKvStore(USER_FILES_DB);
            let fdata = await store.get(uname);
            console.log(fdata);
            Object.assign(data, fdata);
            chrome.runtime.sendMessage({ verified: true, data: data });
            window.close();
        }
        else {
            // face found is not verified
            $('#hiddenpass').show();
            $('#takePhoto').hide();
            let login_submit = document.getElementById('pass');
            login_submit.onclick = check_password;

        }
    }
    else if (uname == undefined) {
        alert("Please Login first!");
        window.close();
        // window.open("index.html", "_self");
        chrome.runtime.sendMessage({ verified: false });
    }
    else {
        // face found is not verified
        $('#hiddenpass').show();
        $('#takePhoto').hide();
        let login_submit = document.getElementById('pass');
        login_submit.onclick = check_password;
    }
}


async function check_password() {
    let pass = document.getElementById("password").value;

    if (uname == undefined || pass == undefined)
        console.log("Empty password field" + pass + uname);
    else {
        console.log("Valid uname/pass");
        let store = new IdbKvStore(USER_DB);
        console.log("Created DB");
        // Get user from DB
        let value = await store.get(uname);

        if (value == pass) {
            let store = new IdbKvStore(USER_DATA_DB);
            let data = await store.get(uname);
            console.log(data);
            store = new IdbKvStore(USER_FILES_DB);
            let fdata = await store.get(uname);
            console.log(fdata);
            Object.assign(data, fdata);
            chrome.runtime.sendMessage({ verified: true, data: data });
            window.close();
        }
        else {
            console.log("Value " + value + " pass " + pass);
            console.log("Invalid password");

        }

    }
}
let login_butt = document.getElementById("login");
login_butt.onclick = identify;

setTimeout(function () {
    $('.video-overlay').fadeOut("slow");
}, 3000);
$('#hiddenpass').hide();

async function displayName(){
    uname = await getCurrentUser();
    $('#username').text("Hi " + uname + "!");
}
displayName();