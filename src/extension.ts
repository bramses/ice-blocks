// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ice-blocks" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ice-blocks.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ice-blocks!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(

		vscode.commands.registerCommand('iceBlocks.open', () => {

			const editor = vscode.window.activeTextEditor;


			// Create and show a new webview

			const panel = vscode.window.createWebviewPanel(

				'catCoding', // Identifies the type of the webview. Used internally

				'Cat Coding', // Title of the panel displayed to the user

				vscode.ViewColumn.Two, // Editor column to show the new webview panel in.

				{
					enableScripts: true
				} // Webview options. More on these later.

			);

			panel.webview.html = getWebviewContent();

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(
				message => {
				  switch (message.command) {
					case 'alert':
					  console.log(editor?.selection.active)
					  vscode.window.showErrorMessage(message.text);
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

function getWebviewContent() {

	return `<!DOCTYPE html>
	
	<html lang="en">
	
	<head>
	
	<meta charset="UTF-8">
	
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	
	<title>Cat Coding</title>

	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/default.min.css">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/highlight.min.js"></script>
	<!-- and it's easy to individually load additional languages -->
	<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/languages/go.min.js"></script>
	<script>hljs.highlightAll();</script>
	</head>
	
	<body>
	
	<img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />

	<pre><code class="language-html" id="code-block-1"> &lt;pre&gt;&lt;code class=&quot;html&quot;&gt;&amp;lt;input type=&quot;text&quot; name=&quot;test&quot; id=&quot;test&quot; value=&quot;&quot;&amp;gt;&lt;/code&gt;&lt;/pre&gt;
	</code></pre>

	<script>
	  function htmlDecode(input) {
		var doc = new DOMParser().parseFromString(input, "text/html");
		return doc.documentElement.textContent;
	  }

        (function() {
            const vscode = acquireVsCodeApi();
            const counter = document.getElementById('code-block-1');

			counter.addEventListener('click', () => {
				vscode.postMessage({
					command: 'alert',
					text: htmlDecode(counter.innerText)
				});
			});
        }())
    </script>
	
	</body>
	
	</html>`;
	
	}

// this method is called when your extension is deactivated
export function deactivate() { 

}
