const db = require('./index');
const x = new db.async.Database('./jddb/test.json');
const xr = new db.Database('./jddb/testsync.json');
async function dbQuery() {
	await x.insert({
		id: '123',
		abilities: {
			fire: ['flame arrow', 'fireball'],
			water: ['rain'],
			earth: [],
		},
	});
	let data = await x.select((obj) => obj.id == '123');
}
//dbQuery();

function syncQuery() {
	xr.insert({ id: '123', name: 'john' }).run();
	let val = xr.select((obj) => obj.id == '123').run();
	console.log(val);
}
syncQuery();
