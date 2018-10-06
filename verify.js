const EUCLID_MAX_DISTANCE = 0.6;

(async function() { 
    await load_models();
})();

console.log("Loaded verify.js")

let classes = [];
const use_model = "ssd"; // 'ssd', 'mtcnn' 

// Yolo Parameters
const yoloUseBatchProcessing = false;
const yoloParams = {
    inputSize: "lg",
    scoreThreshold: 0.2
}

// mtcnn parameters
const mtcnnParams = {
    minFaceSize: 200
}

// SSD parameters
const ssd_min_confidence = 0.3;


async function load_models() {
    await faceapi.loadFaceRecognitionModel(MODEL_URL);
    switch (use_model) {
        case "yolo":
            await faceapi.loadTinyYolov2Model(MODEL_URL);
            // For full landmark
            await faceapi.loadFaceLandmarkModel(MODEL_URL);
            // For tiny landmark
            // await faceapi.loadFaceLandmarkTinyModel(MODEL_URL)
            break;
        case "mtcnn":
            await faceapi.loadMtcnnModel(MODEL_URL);
            break;
        case "ssd":
            await faceapi.loadSsdMobilenetv1Model(MODEL_URL);
            // For full landmark
            await faceapi.loadFaceLandmarkModel(MODEL_URL);
            // For tiny landmark
            // await faceapi.loadFaceLandmarkTinyModel(MODEL_URL)
            break;
    }
}

async function matchAccuracy(inputEl , tdc) {
    const { width, height } = inputEl;
    let fullFaceDescriptions;
    switch (use_model) {
        case "yolo":
            fullFaceDescriptions = (await faceapi.allFacesTinyYolov2(inputEl, yoloParams, yoloUseBatchProcessing))
                .map(fd => fd.forSize(width, height));
            break;
        case "mtcnn":
            fullFaceDescriptions = (await faceapi.allFacesMtcnn(inputEl, mtcnnParams))
                .map(fd => fd.forSize(width, height));
            break;
        case "ssd":
            fullFaceDescriptions = (await faceapi.allFacesSsdMobilenetv1(inputEl, ssd_min_confidence))
                .map(fd => fd.forSize(width, height));
            break;

    }
    if (!Array.isArray(fullFaceDescriptions) || !fullFaceDescriptions.length) {
        return [0.00, undefined];
    }

    for (let descripton of fullFaceDescriptions) {
        const { detection, landmarks, descriptor } = descripton;
        const bestMatch = getBestMatch(tdc, descriptor);
        return [((1 - bestMatch.distance)).toFixed(2), bestMatch.className];
    }
}


// Fetch images of each class and return their descriptors and classname
async function initTrainDescriptorsByClass(net, classMapping) {
    return Promise.all(classes.map(
        async className => {
            const descriptors = [];
            for (let value of classMapping[className]) {
                const img = await faceapi.bufferToImage(value);
                descriptors.push(await net.computeFaceDescriptor(img));
            }
            return {
                descriptors,
                className
            }
        }
    ));
}

// Best match using eucledian distance
function getBestMatch(descriptorsByClass, queryDescriptor) {
    function computeMeanDistance(descriptorsOfClass) {
        return faceapi.round(
            descriptorsOfClass
                .map(d => faceapi.euclideanDistance(d, queryDescriptor))
                .reduce((d1, d2) => d1 + d2, 0) /
            (descriptorsOfClass.length || 1)
        )
    }
    return descriptorsByClass
        .map(
            ({ descriptors, className }) => ({
                distance: computeMeanDistance(descriptors),
                className
            })
        )
        .reduce((best, curr) => best.distance < curr.distance ? best : curr)
}

async function getClassToImg(store, classes) {
    let o = {};
    for(let c of classes) {
        o[c] = await store.get(c);
    }
    return o;
}

async function verify(image) {
    let store = new IdbKvStore(USER_DB);
    classes = await store.keys();
    store = new IdbKvStore(DB_NAME);
    let classMapping = await getClassToImg(store, classes);
    console.log(classMapping);
    let tdc = await initTrainDescriptorsByClass(faceapi.recognitionNet, classMapping);
    let imgObject = new Image();
    imgObject.src = URL.createObjectURL(image);
    return await matchAccuracy(imgObject, tdc);
}
