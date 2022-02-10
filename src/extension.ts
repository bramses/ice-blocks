import * as vscode from 'vscode';
import * as firebase from './firebase';
import { readFile } from './localFileHandler';
const { getFirestore } = require('firebase-admin/firestore');


const FILETYPES: { [key: string]: string } = {
	"ts": "typescript",
	"tsx": "typescript",
	"js": "javascript",
	"py": "python",
	"html": "html",
	"zshrc": "shell",
	"sh": "shell",
	"css": "css"
};

async function showInputBox(placeHolder = 'Enter a name for your code block') {

	const result: string | undefined = await vscode.window.showInputBox({
		value: '',
		placeHolder,
		title: 'Ice Blocks',
		ignoreFocusOut: true,
	});

	return result;
}

const logic = async (editor: vscode.TextEditor | undefined) => {
	try {
		let codeBlock: string | undefined = editor?.document.getText(editor.selection);
		const filename: string[] | undefined = editor?.document.fileName.split('.');
		const fileType: string | undefined = filename?.slice(-1)[0];


		if (codeBlock === undefined) {
			vscode.window.showErrorMessage('Please select some code');
			return;
		}
		if (fileType === undefined) {
			vscode.window.showErrorMessage('Please select a file');
			return;
		}
		const language = FILETYPES[fileType];
		if (language === undefined) {
			vscode.window.showErrorMessage('Please select a valid filetype');
			return;
		}

		const title = await showInputBox();
		const urls = await showInputBox('Enter relevant urls [optional] separated by commas');
		let terminalCommand = await showInputBox('Enter a companion terminal command [optional]');

		if (title === undefined) {
			vscode.window.showErrorMessage('Please enter a title for code block');
			return;
		}

		interface CodeBlock {
			code: string;
			language: string;
			title: string;
			urls: string[] | undefined;
			terminalCommand: string | null | undefined;
		}

		const codeBlockRes: CodeBlock = {
			code: codeBlock,
			language,
			title,
			urls: urls === '' ? [] : urls?.split(','),
			terminalCommand: terminalCommand === '' ? null : terminalCommand,
		};

		const res = await firebase.addCodeBlock(codeBlockRes.code, codeBlockRes.language, codeBlockRes.title, codeBlockRes.urls, codeBlockRes.terminalCommand);
		console.log(res);

		return null;
	} catch (err) {
		console.error(err);
		return null;
	}
};

export async function activate(context: vscode.ExtensionContext) {


	console.log('Congratulations, your extension "ice-blocks" is now active!');

	let disposable = vscode.commands.registerCommand('ice-blocks.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from ice-blocks!');
	});

	// firebase.addCodeBlock("console.log('Hello World 2')", "javascript", "Hello World 2", ["https://www.google.com/1"]).then((res:any) => {
	// 	console.log(res);
	// });

	// this needed
	

	context.subscriptions.push(disposable);

	let firebaseDisposable = vscode.commands.registerCommand('ice-blocks.sendToFirebase', async () => {
		const editor = vscode.window.activeTextEditor;
		await logic(editor);
		// if (url) {
		//     vscode.window.showInformationMessage(`Created page successfully`, 'open page').then(async (value) => {
		//         if (value === 'open page') { 
		//             vscode.env.openExternal(vscode.Uri.parse(url));
		//         }
		//     });

		// } else {
		//     vscode.window.showErrorMessage('Could not create page -- check dev console');
		// }
	});

	context.subscriptions.push(firebaseDisposable);

	context.subscriptions.push(

		vscode.commands.registerCommand('ice-blocks.open', async () => {

			const db = getFirestore();
			const codeBlocks = await firebase.findCodeBlock(db, 'python');

			const editor = vscode.window.activeTextEditor;

			if (editor === undefined) {
				vscode.window.showErrorMessage('Active editor is undefined interact to start');
				return;
			}

			// Create and show a new webview

			const panel = vscode.window.createWebviewPanel(

				'iceBlocks', // Identifies the type of the webview. Used internally

				'Ice Blocks', // Title of the panel displayed to the user

				vscode.ViewColumn.Two, // Editor column to show the new webview panel in.

				{
					enableScripts: true
				} // Webview options. More on these later.

			);

			panel.webview.html = await getWebviewContent(codeBlocks);
			// panel.webview.html = await getWebviewContent();

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case 'alert':
							console.log(editor?.selection.active);
							// vscode.window.showErrorMessage(message.text);
							editor?.edit(editBuilder => {
								editBuilder.insert(editor.selection.active, message.text);
							});

							return;
					}
				},
				undefined,
				context.subscriptions
			);

		})
	);
}

const codeBlocksExamples = [
	{
		id: 'code-block-1',
		terminalCommand: 'npm i dotenv',
		code: `const dotenv = require('dotenv');
dotenv.config();

console.log(process.env.DB_HOST);`,
		language: 'javascript',
		title: 'Using dotenv',
		priority: 0,
	},
	{
		language: 'python',
		title: 'Using pandas',
		code: `import pandas as pd

df = pd.read_csv('data.csv')
df.head()

def get_data(df):
return df.head()
`,
		terminalCommand: 'pip install pandas',
		id: 'code-block-2',
		urls: ['https://www.google.com/1', 'https://www.google.com/2'],
		priority: 2
	},
	{
		language: 'html',
		title: 'Using highlight.js',
		code: `<div class="hljs">
<pre>
<code class="language-html">test</code>
</pre>`,
		id: 'code-block-3',
		priority: 0
	}
];

async function getWebviewContent(codeBlocks: any[] = codeBlocksExamples) {
	let htmlStr = await readFile('../src/index.html');
	htmlStr = htmlStr.replace('{codeblocks}', JSON.stringify(codeBlocks));

	return htmlStr;
}

// this method is called when your extension is deactivated
export function deactivate() {

}
