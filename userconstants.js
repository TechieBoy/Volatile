const CURRENT_USER_DB = "currentuserdb";
const CURRENT_USER_KEY = 'currentuserkey';
const USER_DB = "user";
const CURRENT_USER_STORE = new IdbKvStore(CURRENT_USER_DB);
const DB_NAME = "images";
const USER_FILES_DB = "userFilesDB";
const USER_DATA_DB = "UserDataDB";
const MODEL_URL = "/weights";

console.log('Loaded user constants');
async function getCurrentUser() {
    let user = await CURRENT_USER_STORE.get(CURRENT_USER_KEY);
    if (user == undefined) {
        console.log("No current user");
    }
    console.log("Current user: " + user);

    return user;

}