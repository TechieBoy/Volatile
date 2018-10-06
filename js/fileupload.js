let uploadedFiles = []

let fileTypes = ["aadhar", "pan", "drivingLic", "bill", "passport"];
let fileStore, user;
const ID_PROOF = "id_proof";
const ADDRESS_PROOF = "address_proof";
(async function () {
    fileStore = new IdbKvStore(USER_FILES_DB);
    user = await getCurrentUser();
})();

function getProofType(type) {
    switch (type) {
        case "aadhar":
            return [ID_PROOF];
        case "pan":
            return [ID_PROOF];
        case "drivingLic":
            return [ADDRESS_PROOF];
        case "bill":
            return [ADDRESS_PROOF];
        case "passport":
            return [ID_PROOF, ADDRESS_PROOF];
    }
    return;
}
// getElementById
function $id(id) {
    return document.getElementById(id);
}

// output information
function Output(msg) {
    var m = $id("messages");
    m.innerHTML = msg + m.innerHTML;
}

// file drag hover
function FileDragHover(e) {
    e.stopPropagation();
    e.preventDefault();
    e.target.className = (e.type == "dragover" ? "hover" : "");
}

// file selection
function FileSelectHandler(e) {

    // cancel event and hover styling
    FileDragHover(e);

    // fetch FileList object
    var files = e.target.files || e.dataTransfer.files;

    // process all File objects
    for (var i = 0, f; f = files[i]; i++) {
        ParseFile(f);
        uploadedFiles.push(f);
    }

    submitbutton = $id("submitbutton");
    submitbutton.style.display = "block";
}

// output file information
function ParseFile(file) {
    Output("<p>File Name: <strong>" + file.name + "</strong> Type: <strong>" + file.type + "</strong> Size: <strong>" + file.size + "</strong>B</p>");
}

// initialize
function Init() {

    var fileselect = $id("fileselect"),
        filedrag = $id("filedrag"),
        submitbutton = $id("submitbutton");

    // file select
    fileselect.addEventListener("change", FileSelectHandler, false);

    // is XHR2 available?
    var xhr = new XMLHttpRequest();
    if (xhr.upload) {

        // file drop
        filedrag.addEventListener("dragover", FileDragHover, false);
        filedrag.addEventListener("dragleave", FileDragHover, false);
        filedrag.addEventListener("drop", FileSelectHandler, false);
        filedrag.style.display = "block";

        // remove submit button
        submitbutton.style.display = "none";
    }

}

// call initialization file
if (window.File && window.FileList && window.FileReader) {
    Init();
}

function analyzeFile(name, type) {
    return Math.floor(Math.random() * 2) == 0 ? ID_PROOF : ADDRESS_PROOF;
}


// Stuff to do once user submits
const form = document.querySelector('form');
form.addEventListener('submit', e => {
    e.preventDefault();

    const files = document.querySelector('[type="file"]').files;
    const formData = new FormData();

    let fileBlobs = {};

    var storeInDB = async function () {
        if (Object.keys(fileBlobs).length === uploadedFiles.length) {
            let val = await fileStore.get(user);
            Object.assign(fileBlobs, val);
            await fileStore.set(user, fileBlobs, function (error) {
                if (error)
                    throw error;
                window.open("profile.html", "_self");

            });
            return;
        }
        setTimeout(storeInDB, 20);
    }

    storeInDB();

    for (let i = 0; i < uploadedFiles.length; i++) {
        let file = uploadedFiles[i];

        // DO NOT OPTIMIZE!
        let reader = new FileReader();
        reader.onload = function () {
            let v = analyzeFile() + " : " + file.name;
            fileBlobs[v] = (reader.result.replace(/^data:.*\/.*;base64,/, ""));
        }
        reader.readAsDataURL(file);
    }

    console.log(uploadedFiles);

});