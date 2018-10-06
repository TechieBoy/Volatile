
let uname;

let video = document.getElementById("videoElement");
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
		return undefined;

	}
	mediaStream.removeTrack(mediaStreamTrack);
}

function parseURLParams(url) {
	var queryStart = url.indexOf("?") + 1,
		queryEnd = url.indexOf("#") + 1 || url.length + 1,
		query = url.slice(queryStart, queryEnd - 1),
		pairs = query.replace(/\+/g, " ").split("&"),
		parms = {}, i, n, v, nv;

	if (query === url || query === "") return;

	for (i = 0; i < pairs.length; i++) {
		nv = pairs[i].split("=", 2);
		n = decodeURIComponent(nv[0]);
		v = decodeURIComponent(nv[1]);

		if (!parms.hasOwnProperty(n)) parms[n] = [];
		parms[n].push(nv.length === 2 ? v : null);
	}
	return parms;
}

async function login() {
	//let confidence = await verify();
	$("#videoElement").fadeOut(300).fadeIn(150);
	image = await captureImage();
	$(".video-overlay").text("Processing...");
	$(".video-overlay").show();
	let user = await verify(image);

	// get current username
	uname = parseURLParams(window.location.href).name[0];
	console.log(uname);

	console.log("User" + user[1] + " Confidence" + user[0]);

	if (uname == undefined) {
		console.log("Unknown user");
		window.open('index.html', "_self");
	}
	else if (uname == user[1]) {
		if (user[0] < 0.5) {
			$('#hiddenpass').show();
			$('#takePhoto').hide();
			let login_submit = document.getElementById('pass');
			login_submit.onclick = check_password;
		}
		else {
			console.log("Successful detection");
			store = new IdbKvStore(CURRENT_USER_DB);
			store.set(CURRENT_USER_KEY, uname);
			window.open('profile.html', "_self");
		}
	} else {
		console.log("No face in image");
		window.open('login.html?name=' + uname, "_self");
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
			console.log("Sucessfull login");
			store = new IdbKvStore(CURRENT_USER_DB);
			store.set(CURRENT_USER_KEY, uname);
			window.open('profile.html', "_self");
		}
		else {
			console.log("Value " + value + " pass " + pass);
			console.log("Invalid password");

		}

	}
}
let login_butt = document.getElementById("login");
login_butt.onclick = login;

setTimeout(function () {
	$('.video-overlay').fadeOut("slow");
}, 3000);
$('#hiddenpass').hide();