const Path = require('path');
const zlib = require('zlib');
const fs = require('fs');

const _path = Symbol('path');
const _fn = Symbol('fn');
class Database {
	/**
	 *
	 * @param {string} path
	 */
	constructor(path = './jddb.json') {
		if (!fs.existsSync(path)) {
			fs.writeFileSync(path, compress('[]'));
		}
		this._path = path;
	}
	/**
	 *
	 * @param {(obj:any)=>boolean} selector
	 */
	select(selector) {
		//return new SyncQuery(() => {
		const data = decompress(fs.readFileSync(this._path));
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(data.toString());
		/**
		 * @type {number}
		 */
		let selectedIndex;
		let selected = [];
		for (let i in docs) {
			// if (selector(docs[i])) {
			// 	selectedIndex = +i;
			// 	break;
			// }
			if (selector(docs[i])) {
				selected.push(docs[i]);
			}
		}
		let obj = docs[selectedIndex];
		return selected;
		//});
	}
	insert(data) {
		//return new SyncQuery(() => {
		const fdata = decompress(fs.readFileSync(this._path));
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(fdata.toString());
		docs.push(data);
		let cdata = compress(JSON.stringify(docs));
		fs.writeFileSync(this._path, cdata);
		//});
	}
	/**
	 *
	 * @param {(obj:*)=>boolean} selector
	 * @param {*} newValue
	 */
	modify(selector, newValue) {
		//return new SyncQuery(() => {
		const data = decompress(fs.readFileSync(this._path));
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(data.toString());
		// /**
		//  * @type {{[key:string]:any}}
		//  */
		// let selected;
		/**
		 * @type {number}
		 */
		let selectedIndex;
		for (let i in docs) {
			if (selector(docs[i])) {
				//selected = docs[i];
				selectedIndex = +i;
				break;
			}
		}
		docs[selectedIndex] = newValue;
		let cdata = compress(JSON.stringify(docs));
		fs.writeFileSync(this._path, cdata);
		//});
	}
	/**
	 *
	 * @param {(obj:*)=>boolean} selector
	 */
	delete(selector) {
		//return new SyncQuery(() => {
		const data = compress(fs.readFileSync(this._path));
		/**
		 * @type {Array<{[key:string]:any}>}
		 */
		const docs = JSON.parse(data.toString());
		/**
		 * @type {number}
		 */
		let selectedIndex;
		for (let i in docs) {
			if (selector(docs[i])) {
				selectedIndex = +i;
				break;
			}
		}
		docs.splice(selectedIndex, 1);
		let cdata = compress(JSON.stringify(docs));
		fs.writeFileSync(this._path, cdata);
		//});
	}
	/**
	 *	`where` property is needed for `modify` 
	 (unless used with `insert` in which case it becomes an `insert or replace`), and `delete`.
	 returns `{
				selected: array,
				modified: boolean,
				insert: boolean,
				deleted: boolean,
			}`
	 * @param {Object} data
	 * @param {(obj:any)=>boolean} [data.where]
	 * @param {any} [data.insert]
	 * @param {any} [data.modify]
	 * @param {boolean} [data.delete]
	 * @example db.query({insert:[1,2,3,4,5]}).run()
	 *
	 * let data=db.query({where:(x)=>x[0]==1}).run()
	 *
	 * db.query({where:(x)=>x[0]==1,modify:[2,3,4,5,1]}).run()
	 *
	 * db.query({where:(x)=>x[0]==2,delete:true}).run
	 *
	 */
	query(data) {
		return new SyncQuery(() => {
			const fdata = decompress(fs.readFileSync(this._path));
			/**
			 * @type {Array<*>}
			 */
			const docs = JSON.parse(fdata.toString());
			const retVal = {
				selected: [],
				modified: false,
				insert: false,
				deleted: false,
			};
			if (data.insert) {
				if (data.insert && data.modify) {
					let exists = false;
					let modifyIndex = 0;
					for (let i in docs) {
						if (docs[i] instanceof Object && data.insert instanceof Object) {
							let obj = docs[i];
							for (let prop in obj) {
								//if (objectPropNamesEqual(docs[i], data.insert)) {
								if (obj[prop] == data.insert[prop]) {
									exists = true;
									modifyIndex = +i;
									break;
								}
							}
							//}
						} else {
							if (docs[i] === data.insert) {
								exists = true;
								modifyIndex = +i;
								break;
							}
						}
					}
					if (exists) {
						docs[modifyIndex] = data.modify;
						retVal.modified = true;
					} else {
						docs.push(data.insert);
						retVal.inserted = true;
					}
				} else {
					docs.push(data.insert);
					retVal.inserted = true;
				}
				let cdata = compress(JSON.stringify(docs));
				fs.writeFileSync(this._path, cdata);
			}
			if (data.where) {
				if (data.modify || data.delete) {
					let selectedIndex = 0;
					if (data.modify) {
						for (let i in docs) {
							if (data.where(docs[i])) {
								selectedIndex = +i;
								break;
							}
						}
						docs[selectedIndex] = data.modify;
						retVal.modified = true;
						let cdata = compress(JSON.stringify(docs));
						fs.writeFileSync(this._path, cdata);
					} else {
						for (let i in docs) {
							if (data.where(docs[i])) {
								selectedIndex = +i;
								break;
							}
						}
						docs.splice(selectedIndex, 1);
						retVal.deleted = true;
						let cdata = compress(JSON.stringify(docs));
						fs.writeFileSync(this._path, cdata);
					}
				} else {
					for (let i of docs) {
						if (data.where(docs)) {
							retVal.selected.push(i);
						}
					}
				}
			}

			return retVal;
		});
	}
}
class SyncQuery {
	/**
	 *
	 * @param {()=>*} fn
	 */
	constructor(fn) {
		/**
		 * @private
		 */
		this[_fn] = fn;
	}
	run() {
		return this[_fn]();
	}
}
class AsyncDatabase {
	/// TODO create a query system for the database
	/// schematic: create query array and exec per order/exec on query and remove from array or divide queries into types and do teh same as before
	// or not
	/**
	 * @dparam {Object} opts
	 * @dparam {string} opts.path
	 * @param {string} path
	 * @cparam {T} opts.schema object which will define what goes into the database
	 * @cexample const database=new Database({schema:{
	 * 		id:String,
	 * 		index:Number
	 * 	}
	 * })
	 */
	constructor(path = './jddb.json') {
		if (!fs.existsSync(path)) {
			fs.writeFileSync(path, compress('[]'));
		}
		this._path = path;
	}
	/**
	 * @param {(obj:*)=>Boolean} selector
	 * @returns {Promise<AsyncQuery>}
	 */
	async select(selector) {
		const data = await readFileAsync(this._path).then(decompressAsync);
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(data.toString());
		/**
		 * @type {number}
		 */
		let selectedIndex;
		for (let i in docs) {
			if (selector(docs[i])) {
				//selected = docs[i];
				selectedIndex = +i;
				break;
			}
		}
		let obj = docs[selectedIndex];
		return new AsyncQuery(this._path, obj);
	}
	/**
	 * @param {(obj:*)=>Boolean} selector
	 */
	async obtain(selector) {
		const data = await readFileAsync(this._path).then(decompressAsync);
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(data.toString());
		/**
		 * @type {number}
		 */
		let selectedIndex;
		for (let i in docs) {
			if (selector(docs[i])) {
				//selected = docs[i];
				selectedIndex = +i;
				break;
			}
		}
		return docs[selectedIndex];
	}
	/**
	 *
	 * @param {*} data
	 */
	async insert(data) {
		const fdata = await readFileAsync(this._path).then(decompressAsync);
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(fdata.toString());
		docs.push(data);
		let cdata = await compressAsync(JSON.stringify(docs));
		await writeFileAsync(this._path, cdata);
	}
	/**
	 *
	 * @param {(obj:*)=>Boolean} selector
	 * @param {*} newValue
	 */
	async modify(selector, newValue) {
		const data = await readFileAsync(this._path).then(decompressAsync);
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(data.toString());
		// /**
		//  * @type {{[key:string]:any}}
		//  */
		// let selected;
		/**
		 * @type {number}
		 */
		let selectedIndex;
		for (let i in docs) {
			if (selector(docs[i])) {
				//selected = docs[i];
				selectedIndex = +i;
				break;
			}
		}
		docs[selectedIndex] = newValue;
		let cdata = await compressAsync(JSON.stringify(docs));
		await writeFileAsync(this._path, cdata);
	}
	/**
	 *
	 * @param {(obj:*)=>Boolean} selector
	 */
	async delete(selector) {
		const data = await readFileAsync(this._path).then(decompressAsync);
		/**
		 * @type {Array<{[key:string]:any}>}
		 */
		const docs = JSON.parse(data.toString());
		/**
		 * @type {number}
		 */
		let selectedIndex;
		for (let i in docs) {
			if (selector(docs[i])) {
				selectedIndex = +i;
				break;
			}
		}
		docs.splice(selectedIndex, 1);
		let cdata = await compressAsync(JSON.stringify(docs));
		await writeFileAsync(this._path, cdata);
	}
	/**
	 *	`where` property is needed for `modify` 
	 (unless used with `insert` in which case it becomes an `insert or replace`), and `delete`.
	 returns `{
				selected: array,
				modified: boolean,
				insert: boolean,
				deleted: boolean,
			}`
	 * @param {Object} data
	 * @param {(obj:any)=>boolean} [data.where]
	 * @param {any} [data.insert]
	 * @param {any} [data.modify]
	 * @param {boolean} [data.delete]
	 * @example db.query({insert:[1,2,3,4,5]}).run()
	 *
	 * let data=db.query({where:(x)=>x[0]==1}).run()
	 *
	 * db.query({where:(x)=>x[0]==1,modify:[2,3,4,5,1]}).run()
	 *
	 * db.query({where:(x)=>x[0]==2,delete:true}).run
	 *
	 */
	query(data) {
		return new AsyncQuery(this._path, async (documents) => {
			const retVal = {
				selected: [],
				modified: false,
				insert: false,
				deleted: false,
			};
			if (data.insert) {
				if (data.insert && data.modify) {
					let exists = false;
					let modifyIndex = 0;
					for (let i in documents) {
						if (
							documents[i] instanceof Object &&
							data.insert instanceof Object
						) {
							let obj = documents[i];
							for (let prop in obj) {
								//if (objectPropNamesEqual(documents[i], data.insert)) {
								if (obj[prop] == data.insert[prop]) {
									exists = true;
									modifyIndex = +i;
									break;
								}
							}
							//}
						} else {
							if (documents[i] === data.insert) {
								exists = true;
								modifyIndex = +i;
								break;
							}
						}
					}
					if (exists) {
						documents[modifyIndex] = data.modify;
						retVal.modified = true;
					} else {
						documents.push(data.insert);
						retVal.inserted = true;
					}
				} else {
					documents.push(data.insert);
					retVal.inserted = true;
				}
				let cdata = await compressAsync(JSON.stringify(documents));
				await writeFileAsync(this._path, cdata);
			}
			if (data.where) {
				if (data.modify || data.delete) {
					let selectedIndex = 0;
					if (data.modify) {
						for (let i in documents) {
							if (data.where(documents[i])) {
								selectedIndex = +i;
								break;
							}
						}
						documents[selectedIndex] = data.modify;
						retVal.modified = true;
						let cdata = await compressAsync(JSON.stringify(documents));
						await writeFileAsync(this._path, cdata);
					} else {
						for (let i in documents) {
							if (data.where(documents[i])) {
								selectedIndex = +i;
								break;
							}
						}
						documents.splice(selectedIndex, 1);
						retVal.deleted = true;
						let cdata = await compressAsync(JSON.stringify(documents));
						await writeFileAsync(this._path, cdata);
					}
				} else {
					for (let i of documents) {
						if (data.where(documents)) {
							retVal.selected.push(i);
						}
					}
				}
			}

			return retVal;
		});
	}
}

class AsyncQuery {
	/**
	 * @param {string} path
	 * @param {(data:any[])=>any} fn
	 */
	constructor(path, fn) {
		this._path = path;
		this._fn = fn;
	}
	// /**
	//  *
	//  */
	// obtain() {
	// 	// const data = await readFileAsync(_path).then(decompressAsync);
	// 	// /**
	// 	//  * @type {Array<{[key:string]:any}>}
	// 	//  */
	// 	// const docs = JSON.parse(data.toString());
	// 	// return docs.find((x) => x[prop] == val);
	// 	return this._selected;
	// }

	// /**
	//  *

	//  * @param {*} newValue
	//  */
	// async modify(newValue) {
	// 	const data = await readFileAsync(this._path).then(decompressAsync);
	// 	/**
	// 	 * @type {Array<{[key:string]:any}>}
	// 	 */
	// 	const docs = JSON.parse(data.toString());
	// 	// /**
	// 	//  * @type {{[key:string]:any}}
	// 	//  */
	// 	// let selected;
	// 	/**
	// 	 * @type {number}
	// 	 */
	// 	let selectedIndex;
	// 	for (let i in docs) {
	// 		if (docs[i] == this._selected) {
	// 			//selected = docs[i];
	// 			selectedIndex = +i;
	// 			break;
	// 		}
	// 	}
	// 	docs[selectedIndex] = newValue;
	// 	let cdata = await compressAsync(JSON.stringify(docs));
	// 	await writeFileAsync(this._path, cdata);
	// }
	// async delete() {
	// 	const data = await readFileAsync(this._path).then(decompressAsync);
	// 	/**
	// 	 * @type {Array<{[key:string]:any}>}
	// 	 */
	// 	const docs = JSON.parse(data.toString());
	// 	/**
	// 	 * @type {number}
	// 	 */
	// 	let selectedIndex;
	// 	for (let i in docs) {
	// 		if (docs[i] == this._selected) {
	// 			selectedIndex = +i;
	// 			break;
	// 		}
	// 	}
	// 	docs.splice(selectedIndex, 1);
	// 	let cdata = await compressAsync(JSON.stringify(docs));
	// 	await writeFileAsync(this._path, cdata);
	// }
	async run() {
		const data = await readFileAsync(this._path).then(decompressAsync);
		/**
		 * @type {Array<*>}
		 */
		const docs = JSON.parse(data.toString());
		return await this._fn(docs);
	}
}
function compress(data) {
	if (!(data instanceof Buffer)) data = Buffer.from(data);
	return zlib.deflateSync(data);
}
/**
 *
 * @param {*} data
 * @returns {Promise<Buffer>}
 */
function compressAsync(data) {
	if (!(data instanceof Buffer)) data = Buffer.from(data);
	return new Promise((res, rej) => {
		zlib.deflate(data, (err, result) => {
			if (err) rej(err);
			res(result);
		});
	});
}
function decompress(data) {
	if (!(data instanceof Buffer)) throw Error('decompress data is not buffer');
	return zlib.inflateSync(data);
}
/**
 *
 * @param {*} data
 * @returns {Promise<Buffer>}
 */
function decompressAsync(data) {
	return new Promise((res, rej) => {
		if (!(data instanceof Buffer))
			data = rej('decompression data is not a buffer');
		zlib.inflate(data, (err, result) => {
			if (err) rej(err);
			res(result);
		});
	});
}
/**
 *
 * @param {string} path
 * @returns {Promise<Buffer>}
 */
function readFileAsync(path) {
	return new Promise((res, rej) => {
		fs.readFile(path, (err, buff) => {
			if (err) rej(err);
			res(buff);
		});
	});
}
/**
 *
 * @param {string} path
 * @param {*} data
 * @returns {Promise<void>}
 */
function writeFileAsync(path, data) {
	return new Promise((res, rej) => {
		fs.writeFile(path, data, (err) => {
			if (err) rej(err);
			res();
		});
	});
}
function arraysEqual(_arr1, _arr2) {
	if (
		!Array.isArray(_arr1) ||
		!Array.isArray(_arr2) ||
		_arr1.length !== _arr2.length
	)
		return false;

	var arr1 = _arr1.concat().sort();
	var arr2 = _arr2.concat().sort();

	for (var i = 0; i < arr1.length; i++) {
		if (arr1[i] !== arr2[i]) return false;
	}

	return true;
}
function objectsEqual(_obj1, _obj2) {
	if (
		_obj1 === null ||
		_obj1 === undefined ||
		_obj2 === null ||
		_obj2 === undefined
	) {
		return _obj1 === _obj2;
	}
	if (_obj1.constructor !== _obj2.constructor) {
		return false;
	}
	if (_obj1 === _obj2 || _obj1.valueOf() === _obj2.valueOf()) {
		return true;
	}
	if (Array.isArray(_obj1) && _obj1.length !== _obj2.length) {
		return false;
	}
	if (_obj1 instanceof Date) {
		return false;
	}
	if (!(_obj1 instanceof Object)) return false;
	if (!(_obj2 instanceof Object)) return false;
	let k = Object.keys(_obj1);
	return Object.keys(_obj2).every((v) => {
		return (
			k.indexOf(v) !== -1 && k.every((v) => objectsEqual(_obj1[v], _obj2[v]))
		);
	});
}
function objectPropNamesEqual(x, y) {
	if (!(x instanceof Object)) return false;
	if (!(y instanceof Object)) return false;
	let xk = Object.keys(x);
	let yk = Object.keys(y);
	return yk.every((v) => {
		return !(y[v] instanceof Object && x[v] instanceof Object)
			? xk.includes(v)
			: objectPropNamesEqual(x[v], y[v]);
	});
}
exports.Database = Database;
exports.async = { Database: AsyncDatabase };
