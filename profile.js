window.onload = getinfo;
async function getinfo() {
    let curr_user = await getCurrentUser();
    $('#username').text("Hi " + curr_user + "!");
    let store = new IdbKvStore(DB_NAME);
    let allUserImages = await store.get(curr_user);
    console.log(allUserImages);
    let ulElement = document.getElementById('slides');
    for (let image of allUserImages) {

        var liElement = document.createElement('li');
        // create the image element
        var imageElement = document.createElement('img');
        imageElement.setAttribute('src', URL.createObjectURL(image));
        imageElement.onload = () => { URL.revokeObjectURL(image.src); }
        // append the element to the container
        liElement.appendChild(imageElement);
        ulElement.appendChild(liElement);


        setTimeout(function () {
            var elems = document.querySelectorAll('.slider');
            var instances = M.Slider.init(elems, { height: 250, interval: 1500, duration: 500 });
            var instance = M.Slider.getInstance(elems[0]);
            instance.start();
            // instance.next();
        }, 50);

    }
    console.log(allUserImages);


    let doc = new IdbKvStore(USER_FILES_DB);
    let docs_from_db = await doc.get(curr_user);
    let alldocs = Object.keys(docs_from_db);
    var br = document.createElement('br');
    var divElement = document.getElementById('docsList');
    divElement.appendChild(br);

    let doclist = document.getElementById('docsList');

    for (let doc of alldocs) {

        var li = document.createElement('li');

        var text = document.createTextNode(doc);
        li.appendChild(text);
        li.classList.add("collection-item");
        doclist.appendChild(li);
    }
}

async function goToIndex() {
    await CURRENT_USER_STORE.clear();
    window.open("index.html", "_self");
}

var logout = document.getElementById('logout');
logout.onclick = goToIndex;