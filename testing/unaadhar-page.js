let details = ["fname", "lname", "address", ,"email", "address_proof", "id_proof"]

async function callVerify() {
	result = await unaadhar.verify("id");
	console.log(result);
	$('.modal').modal('close');
	autoFillDetails(result);
	$('#submitbtn').show();
}

function autoFillDetails(result) {
	for (let id of details.values()) {
		console.log(id);
		$('#' + id).val(result[id]);
	}

	const dT = new ClipboardEvent('').clipboardData || // Firefox < 62 workaround exploiting https://bugzilla.mozilla.org/show_bug.cgi?id=1422655
		new DataTransfer(); // specs compliant (as of March 2018 only Chrome)

	let fd = new FormData();
	for (let detail of Object.keys(result)) {
		matches = detail.match(/.*_proof : (.*)/);
		if (matches) {
			console.log(matches[0]);
			dT.items.add(result[detail], matches[0]);
			let lielement = document.createElement("li");
			let text = document.createTextNode(detail);
			lielement.appendChild(text)
			document.getElementById("filedetails").appendChild(lielement);
		}
	}

	$('#proof')[0].files = dT.files;
	console.log(dT);
}

document.getElementById('verify').onclick = callVerify;
$('#submitbtn').hide();