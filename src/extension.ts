import * as vscode from 'vscode';
import * as firebase from './firebase';
const { getFirestore } = require('firebase-admin/firestore');
//@ts-ignore
import html from "./index.html";


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
	try {
		// https://onlinejsontools.com/stringify-json
		let htmlStr = "<!DOCTYPE html>\n\n<html lang=\"en\">\n\n<head>\n\n    <meta charset=\"UTF-8\">\n\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n\n    <title>Ice Blocks</title>\n\n    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/default.min.css\">\n    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js\"></script>\n    <!-- and it's easy to individually load additional languages -->\n    <script src=\"https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/languages/typescript.min.js\"></script>\n    <script>hljs.highlightAll();</script>\n</head>\n\n<body>\n    <script>\n\n        const codeBlocks = {codeblocks}\n        console.log(codeBlocks[0])\n\n        function escapeHtml(unsafe) {\n            return unsafe\n                .replace(/&/g, \"&amp;\")\n                .replace(/</g, \"&lt;\")\n                .replace(/>/g, \"&gt;\")\n                .replace(/\"/g, \"&quot;\")\n                .replace(/'/g, \"&#039;\");\n        }\n\n        function htmlDecode(input) {\n            var doc = new DOMParser().parseFromString(input, \"text/html\");\n            return doc.documentElement.textContent;\n        }\n\n        function chooseLanguage(language) {\n            switch (language) {\n                case 'bash':\n                    return 'language-bash';\n                case 'css':\n                    return 'language-css';\n                case 'html':\n                    return 'language-html';\n                case 'javascript':\n                    return 'language-javascript';\n                case 'typescript':\n                    return 'language-typescript';\n                case 'json':\n                    return 'language-json';\n                case 'python':\n                    return 'language-python';\n                default:\n                    return 'language-plaintext';\n            }\n        }\n\n        const vscode = acquireVsCodeApi();\n\n        function sendToVSC(code) {\n            \n            console.log(code);\n            vscode.postMessage({\n                command: 'alert',\n                text: code.code,\n                msgId: code.id\n            });\n        }\n\n        function generateCodeBlock(language, code, title, id, terminalCommand = null, urls = null) {\n            const wrapper = document.createElement('div');\n            wrapper.innerHTML += `<h1>${title}</h1>`;\n\n            const codeBlock = document.createElement('pre');\n            if (language === 'html') {\n                code = escapeHtml(code);\n                codeBlock.innerHTML = `<code id=\"${id}\"\" class=\"${chooseLanguage(language)}\">${code}</code>`;\n                codeBlock.addEventListener('click', () => {\n                    sendToVSC({\n                        id: id,\n                        code: htmlDecode(code)\n                    })\n                });\n            } else {\n                codeBlock.innerHTML = `<code id=\"${id}\"\" class=\"${chooseLanguage(language)}\">${code}</code>`;\n                codeBlock.addEventListener('click', () => {\n                    sendToVSC({code: code, id: id});\n                });\n            }\n            wrapper.appendChild(codeBlock);\n\n            if (terminalCommand) {\n                const header = document.createElement('h3');\n                header.innerText = 'Companion Terminal Command';\n                wrapper.appendChild(header);\n                const terminalBlock = document.createElement('pre');\n                terminalBlock.innerHTML = `<code class=\"language-bash\">${terminalCommand}</code>`;\n                wrapper.appendChild(terminalBlock);\n            }\n\n            if (urls && urls.length > 0) {\n                console.log(urls);\n                const header = document.createElement('h3');\n                header.innerText = 'Companion URLs';\n                wrapper.appendChild(header);\n                const urlsBlock = document.createElement('ul');\n                urls.forEach(url => {\n                    const urlBlock = document.createElement('li');\n                    urlBlock.innerHTML = `<a href=\"${url}\">${url}</a>`;\n                    urlsBlock.appendChild(urlBlock);\n                });\n\n                wrapper.appendChild(urlsBlock);\n            }\n\n            return wrapper;\n        }\n\n        function generateCodeBlocks() {\n            codeBlocks.forEach(codeBlock => {\n                const codeBlockElement = generateCodeBlock(codeBlock.language, codeBlock.code, codeBlock.title, codeBlock.id, codeBlock.terminalCommand, codeBlock.urls);\n                document.body.appendChild(codeBlockElement);\n            });\n        }\n\n        generateCodeBlocks();\n\n    </script>\n</body>\n\n</html>";
		htmlStr = htmlStr.replace('{codeblocks}', JSON.stringify(codeBlocks));

		return htmlStr;
	} catch (err) {
		console.error(err);
		return `err: ${err}`;
	}
	
}

// this method is called when your extension is deactivated
export function deactivate() {

}
