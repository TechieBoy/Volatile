async function checkAndSetPassword() {
	console.log("Entered");
	let uname = document.getElementById("username").value;
	let pass = document.getElementById("password").value;
	let firstname = document.getElementById("firstname").value;
	let lastname = document.getElementById("lastname").value;
	let address = document.getElementById("address").value;
	let email = document.getElementById("email").value;


	if (uname == "" || pass == "")
		console.log("Please fill uname/pass");
	else {
		console.log("Valid uname/pass");
		let store = new IdbKvStore(USER_DB);
		console.log("Created DB");
		// Get user from DB
		let value = await store.get(uname);

		if (value != undefined) {
			console.log("User already exists ");
		}
		else {
			console.log("" + uname + " " + pass);
			store = new IdbKvStore(USER_DB);
			await store.set(uname, pass);
			store = new IdbKvStore(CURRENT_USER_DB);
			await store.set(CURRENT_USER_KEY, uname);
			store = new IdbKvStore(USER_DATA_DB);
			let udata = { fname: firstname, lname: lastname, address: address, email: email }
			await store.set(uname, udata);
			console.log("Registered Successfully");
		}

		window.open('uploadface.html', "_self");

	}
};

let submit = document.getElementById('submit');
submit.onclick = checkAndSetPassword;