
const MIN_CONFIDENCE = 0.7;

let video = document.getElementById("videoElement");
let images = new Array();
let current_user;

if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
            video.srcObject = stream;
        })
        .catch(function (error) {
            console.log("Something went wrong!");
        });
}

(async function s() {
    await faceapi.loadFaceDetectionModel(MODEL_URL);
})();
async function captureImage() {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(takePhoto)
        .catch(error => console.error('getUserMedia() error:', error));
}

// async function gotMedia(mediaStream) {
//     // Use mediastream to do whatever you want
//     const mediaStreamTrack = mediaStream.getVideoTracks()[0];
//     const imageCapture = new ImageCapture(mediaStreamTrack);
//     await takePhoto(imageCapture,images);
//     mediaStream.removeTrack(mediaStreamTrack);
// }

let photosTaken = 0;
async function takePhoto(mediaStream) {
    // For taking an image

    const mediaStreamTrack = mediaStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(mediaStreamTrack);


    try {
        $("#videoElement").fadeOut(300).fadeIn(150);
        let blob = await imageCapture.takePhoto();
        console.log("Took a photo!");
        images.push(blob);
        if(++photosTaken === 5)
            $('#next').show();
        else
            $('#morephotos').show();
        // display image todo

    } catch (err) {
        console.error('takePhoto() error:', err);

    }
    mediaStream.removeTrack(mediaStreamTrack);
}


function goToProfile(){
    window.open("profile.html")
}
async function savePhotos() {
    console.log("In save photo!");

    $('#notloader').hide();    
    $('#loader').show();

    current_user = await getCurrentUser();
    let processedImages = await convertImages(images);
    let store = new IdbKvStore(DB_NAME);
    // Store the images for current_user
    console.log("Saving the following images");
    console.log(processedImages);
    console.log(current_user);
    await store.set(current_user, processedImages, function (error) {
        if (error)
            throw error;
        goToProfile();
    });

    
}

function displayPhotos(current_user) {
    let store = new IdbKvStore(DB_NAME);
    // Get photos from DB
    store.get(current_user, function (error, value) {
        if (error) throw error;
        console.log('key=' + current_user + ' value=' + value);

        // Display images
        const img = document.querySelector('img');
        let x = 0;
        let intervalID = setInterval(function () {

            img.src = URL.createObjectURL(value[x]);
            img.onload = () => { URL.revokeObjectURL(img.src); }

            if (++x === value.length) {
                window.clearInterval(intervalID);
            }
        }, 1000);
    });
}

async function convertImages(images) {
    let processedImages = []
    for (const image of images) {
        let imgObject = new Image();
        imgObject.src = URL.createObjectURL(image);
        let faces = await faceapi.locateFaces(imgObject, MIN_CONFIDENCE);
        if (faces[0] != undefined) {
            let k = faces[0]._box;
            let canvas = getImagePortion(imgObject, k._width, k._height, k._x, k._y, 1);
            canvas.toBlob((blob) => {
                processedImages.push(blob);
            });
        } else {
            console.log("No Face found in Image");
        }

    }
    console.log("Got the following processed images");
    console.log(processedImages);
    return processedImages;
}

function getImagePortion(imgObj, newWidth, newHeight, startX, startY, ratio) {
    /* the parameters: - the image element - the new width - the new height - the x point we start taking pixels - the y point we start taking pixels - the ratio */

    //set up canvas for thumbnail
    let tnCanvas = document.createElement('canvas');
    let tnCanvasContext = tnCanvas.getContext('2d');
    tnCanvas.width = newWidth;
    tnCanvas.height = newHeight;

    /* use the sourceCanvas to duplicate the entire image. This step was crucial for iOS4 and under devices. Follow the link at the end of this post to see what happens when you don’t do this */
    let bufferCanvas = document.createElement('canvas');
    let bufferContext = bufferCanvas.getContext('2d');
    bufferCanvas.width = imgObj.width;
    bufferCanvas.height = imgObj.height;
    bufferContext.drawImage(imgObj, 0, 0);

    // Make black and white
    var imageData = bufferContext.getImageData(0, 0, imgObj.width, imgObj.height);
    for (var i = 0; i < imageData.data.length; i += 4) {
        var avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;

        imageData.data[i] = avg;
        imageData.data[i + 1] = avg;
        imageData.data[i + 2] = avg;

    }
    bufferContext.putImageData(imageData, 0, 0, 0, 0, imageData.width, imageData.height);
    /* now we use the drawImage method to take the pixels from our bufferCanvas and draw them into our thumbnail canvas */
    tnCanvasContext.drawImage(bufferCanvas, startX, startY, newWidth * ratio, newHeight * ratio, 0, 0, newWidth, newHeight);
    return tnCanvas;
}



let takephoto = document.getElementById('takephoto');
let next = document.getElementById('next');


takephoto.onclick = captureImage;
next.onclick = savePhotos;

$('#next').hide();
$('#morephotos').hide();
$('#loader').hide();
setTimeout(function(){
    $('.video-overlay').fadeOut("slow");
}, 3000);