import * as vscode from 'vscode';
import * as firebase from './firebase';
import { readFile } from './localFileHandler';
const { getFirestore } = require('firebase-admin/firestore');


const FILETYPES: { [key: string]: string } = {
	"ts": "typescript",
	"js": "javascript",
	"py": "python",
	"html": "html",
	"zshrc": "bash",
	"sh": "bash",
	"css": "css",
};

const fbURL = vscode.workspace.getConfiguration().get('ice-blocks.fbURL');

async function showInputBox(placeHolder = 'Enter a name for your code block') {

	const result: string | undefined = await vscode.window.showInputBox({
		value: '',
		placeHolder,
		title: 'Ice Blocks',
		ignoreFocusOut: true,
	});

	return result;
}

const logic = async (editor: vscode.TextEditor | undefined, db: any) => {
	try {
		let codeBlock: string | undefined = editor?.document.getText(editor.selection);
		const languageObj = getLanguage(editor);

		if (codeBlock === undefined) {
			vscode.window.showErrorMessage('Please select some code');
			return;
		}
		
		if (languageObj === undefined) {
			vscode.window.showErrorMessage('Please select a valid filetype');
			return;
		}

		const language = languageObj.language;

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

		const res = await firebase.addCodeBlock(db, codeBlockRes.code, codeBlockRes.language, codeBlockRes.title, codeBlockRes.urls, codeBlockRes.terminalCommand);
		console.log(res);

		return `${fbURL}${encodeURIComponent(codeBlockRes.title)}`
		;
	} catch (err) {
		console.error(err);
		return null;
	}
};

function getLanguage(editor: vscode.TextEditor | undefined) {
	const filename: string[] | undefined = editor?.document.fileName.split('.');
	const fileType: string | undefined = filename?.slice(-1)[0];

	if (fileType === undefined) {
		vscode.window.showErrorMessage('Please select a file');
		return;
	}
	
	const language = FILETYPES[fileType];
	return { language };
}

export async function activate(context: vscode.ExtensionContext) {


	try {
		console.log('Congratulations, your extension "ice-blocks" is now active!');

		const db = getFirestore();
		console.log('db connected');
	
		let firebaseDisposable = vscode.commands.registerCommand('ice-blocks.sendToFirebase', async () => {
			const editor = vscode.window.activeTextEditor;
			const url = await logic(editor, db);
			if (url) {
			    vscode.window.showInformationMessage(`Created page successfully`, 'open page').then(async (value) => {
			        if (value === 'open page') { 
			            vscode.env.openExternal(vscode.Uri.parse(url));
			        }
			    });
	
			} else {
			    vscode.window.showErrorMessage('Could not create page -- check dev console');
			}
		});
	
		context.subscriptions.push(firebaseDisposable);
	
		context.subscriptions.push(
	
			vscode.commands.registerCommand('ice-blocks.open', async () => {
	
				const language = getLanguage(vscode.window.activeTextEditor);

				if (language === undefined) {
					vscode.window.showErrorMessage('Please select a valid filetype');
					return;
				}

				const codeBlocks = await firebase.findCodeBlock(db, language.language);

				console.log(codeBlocks);
	
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
								console.log(message.msgId);
								firebase.incrementPriority(db, message.msgId);
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
	} catch (err) {
		console.error(err);
	}

	
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
