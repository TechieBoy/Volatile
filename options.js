'use strict';

async function load_models() {
    const modelurl = "/weights";
    console.log("Start Loading Models!");
    await faceapi.loadFaceDetectionModel(modelurl);
    console.log("Finished Loading Models!");
}


const DB_NAME = "images"
const USERNAME = "USERNAME"

const NUM_IMAGES_TAKEN = 5;
const MIN_CONFIDENCE = 0.7;

let backGround = chrome.extension.getBackgroundPage();

// Log background console here
backGround.console = console;

// Use this to continously get media stream in background
// navigator.mediaDevices.getUserMedia({ video: true })
//     .then(gotMedia)
//     .catch(error => console.error('getUserMedia() error:', error));

async function gotMedia(mediaStream) {
    // Use mediastream to do whatever you want
    const mediaStreamTrack = mediaStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(mediaStreamTrack);
    await takeAndSaveSomePhotos(imageCapture, NUM_IMAGES_TAKEN, USERNAME);
    mediaStream.removeTrack(mediaStreamTrack);
}

async function takePhoto(imageCapture) {
    // For taking an image
    try {
        let blob = await imageCapture.takePhoto();
        console.log("Took a photo!");
        return blob;
    } catch (err) {
        console.error('takePhoto() error:', err);
        return Promise.reject(err);
    }
}

async function savePhotos(USERNAME, images) {
    console.log("In save photo!");
    let store = new IdbKvStore(DB_NAME);
    // Store the images for USERNAME
    console.log("Saving the following images");
    console.log(images);
    store.set(USERNAME, images, function (error) {
        if (error)
            throw error;
    });

    chrome.runtime.sendMessage({ done: true }, function (response) {
        console.log(response);
    });
}

function displayPhotos(USERNAME) {
    let store = new IdbKvStore(DB_NAME);
    // Get photos from DB
    store.get(USERNAME, function (error, value) {
        if (error) throw error;
        console.log('key=' + USERNAME + ' value=' + value);

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


async function takeAndSaveSomePhotos(imageCapture, number, USERNAME) {
    let x = 0;
    let images = [];
    let intervalID = setInterval(async function () {
        let blob = await takePhoto(imageCapture).catch(error => console.log(error));
        images.push(blob);
        if (++x === number) {
            window.clearInterval(intervalID);
            let processedImages = await convertImages(images);
            await savePhotos(USERNAME, processedImages);
            displayPhotos(USERNAME);
        }
    }, 1000);
}

async function convertImages(images) {
    let processedImages = []
    await load_models();
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


//
// NOTE:
// Modifying the URL below to another server will likely *NOT* work. Because of browser
// security restrictions, we have to use a file server with special headers
// (CORS) - most servers don't support cross-origin browser requests.
//
// var url = 'http://cdn.mozilla.net/pdfjs/helloworld.pdf';

//
// Disable workers to avoid yet another cross-origin issue (workers need the URL of
// the script to be loaded, and dynamically loading a cross-origin script does
// not work)
//

async function getCanvasFromPdf(pdf_base64) {
    var pdfjsLib = window['pdfjs-dist/build/pdf'];
    // pdfjsLib.disableWorker = true;
    pdfjsLib.workerSrc = chrome.extension.getURL('lib/pdf.worker.js');

    var pdfData = atob(
        'JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwog' +
        'IC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAv' +
        'TWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0K' +
        'Pj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAg' +
        'L1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+' +
        'PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9u' +
        'dAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2Jq' +
        'Cgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJU' +
        'CjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVu' +
        'ZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4g' +
        'CjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAw' +
        'MDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9v' +
        'dCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9G');
    pdfjsLib.getDocument({ data: pdfData }).then(function getPdfHelloWorld(pdf) {
        //
        // Fetch the first page
        //
        console.log("Pdf loaded");
        pdf.getPage(1).then(async function getPageHelloWorld(page) {
            console.log("Page 1 loaded");
            var scale = 1.5;
            var viewport = page.getViewport(scale);
            // var canvas = document.getElementById('the-canvas');
            let canvasId = "kappa";
            var canvas = document.createElement("canvas");
            canvas.setAttribute("id", canvasId);
            var context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            let renderContext = { canvasContext: context, viewport: viewport };

            await page.render(renderContext);

            chrome.runtime.sendMessage({ c: canvas.toDataURL(), w: viewport.width, h: viewport.height }, function (response) {
                console.log(response);
            });
            return canvasId;

        });
    });

}

function runOCRonCanvas(canvasElement) {

}
window.onload = async function () {

    let a = await getCanvasFromPdf();
    runOCRonCanvas(a);
}