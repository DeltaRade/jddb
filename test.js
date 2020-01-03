const db = require('./index');
const x = new db.async.Database('./test.json');
const xr = new db.Database('./testsync.json');
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
	xr.insert({ id: '123', name: 'john' });
	let val = xr.select((obj) => obj.id == '123');
	xr.query({ insert: { a: 1, b: 2 }, modify: { a: 1, b: 8, c: 3 } }).run();
	let value2 = xr.select((x) => x.a === 1);
	console.log(value2);
}
syncQuery();
