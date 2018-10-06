window.onload = getAllUsers;

async function getAllUsers() {

	// redirect to profile is already logged in.
	let cur_user = await getCurrentUser();
	if(cur_user != undefined)
	{
		window.open("profile.html", "_self");
	}

	// get all usernames.
	let store = new IdbKvStore(USER_DB);
	let allUsers = await store.keys();
	let divElement = document.getElementById('allusers');
	for (let user of allUsers) {
		var anchor = document.createElement('a');
		var t = document.createTextNode(user);
		anchor.href = "login.html?name=" + user;
		anchor.target = "_self";
		anchor.appendChild(t);
		anchor.classList.add('collection-item')
		divElement.appendChild(anchor);
	}
	console.log(allUsers);

}