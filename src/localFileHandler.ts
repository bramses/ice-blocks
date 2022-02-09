/** begin fs */
import * as fs from 'fs/promises';
import * as path from 'path';

export async function writeFile(filename: string, json: any) {
	try {
		const writer = await fs.writeFile(filename, JSON.stringify(json, null, 4));
		return writer;
	} catch (err) {
		throw err;
	}
}

export async function readFile(filePath: string) {
	try {
		const file = await fs.readFile(path.resolve(__dirname, filePath));
		return file.toString();
	} catch (err: any) {
		if (err.code === 'ENOENT') {
			return 'Error: The file does not exist.';
		} else {
			throw err;
		}
	}
}
/** end fs */