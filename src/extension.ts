import * as vscode from 'vscode';
import * as firebase from './firebase';
import { readFile } from './localFileHandler';

export async function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "ice-blocks" is now active!');

	let disposable = vscode.commands.registerCommand('ice-blocks.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from ice-blocks!');
	});

	// firebase.addCodeBlock("console.log('Hello World 2')", "javascript", "Hello World 2", ["https://www.google.com/1"]).then((res:any) => {
    // 	console.log(res);
	// });

	const codeBlocks = await firebase.findCodeBlock('javascript');

	context.subscriptions.push(disposable);

	context.subscriptions.push(

		vscode.commands.registerCommand('iceBlocks.open', async () => {

			const editor = vscode.window.activeTextEditor;


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
		title: 'Using dotenv'
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
		id: 'code-block-2'
	},
	{
		language: 'html',
		title: 'Using highlight.js',
		code: `<div class="hljs">
<pre>
<code class="language-html">test</code>
</pre>`,
		id: 'code-block-3'
	}
]

async function getWebviewContent(codeBlocks: any[] = codeBlocksExamples) {
	let htmlStr = await readFile('../src/index.html');
	htmlStr = htmlStr.replace('{codeblocks}', JSON.stringify(codeBlocks));

	console.log(htmlStr);

	return htmlStr;
}

// this method is called when your extension is deactivated
export function deactivate() { 

}
