// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import axios, { AxiosResponse } from "axios";
import { URL } from "url";

let formData = require("form-data");

function isValidHttpUrl(string: string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

const fetchResults = async (image: string) => {
  let data = new formData();
  data.append("language", "eng");
  data.append("isOverlayRequired", "false");

  let config: any = {
    method: "post",
    url: "https://api.ocr.space/parse/image",
    headers: {
      apikey: "K88264012188957",
      ...data.getHeaders(),
    },
    data: data,
  };

  if (isValidHttpUrl(image)) {
    data.append("url", image);
  } else {
    data.append("base64Image", image);
  }
  let res: any;

  try {
    res = await axios(config);

    if (res.data.ParsedResults[0].ParsedText) {
      return res.data.ParsedResults[0].ParsedText;
    } else {
      return false;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const provider = new CodeOCRView(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CodeOCRView.viewType, provider)
  );
}

class CodeOCRView implements vscode.WebviewViewProvider {
  public static readonly viewType = "code-ocr.showOptions";
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: any,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    let i = 0;
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message) => {
        webviewView.webview.postMessage({ loading: true });

        fetchResults(message.text).then((data: any) => {
          if (data) {
            webviewView.webview.postMessage({ loading: false });

            i++;
            let setting: vscode.Uri = vscode.Uri.parse(
              "untitled:" + "Untitled" + i
            );
            vscode.workspace
              .openTextDocument(setting)
              .then((doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, 1, false).then((editor) => {
                  editor.edit((edit) => {
                    edit.replace(
                      new vscode.Range(
                        new vscode.Position(0, 0),
                        new vscode.Position(doc.lineCount + 1, 0)
                      ),
                      data
                    );
                  });
                });
              });
          } else {
            webviewView.webview.postMessage({ loading: false });
            vscode.window.showErrorMessage(
              "Something went wrong. Please try again."
            );
          }
        });
      },
      undefined,
      context.subscriptions
    );
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "main.css")
    );

    return `<!DOCTYPE html>
			  <html lang="en">
			  <head>
				  <meta charset="UTF-8">
				  <meta img-src ${webview.cspSource} https:;  style-src ${webview.cspSource};"
				  />
				  <meta name="viewport" content="width=device-width, initial-scale=1.0">
				  <link href="${styleMainUri}" rel="stylesheet">
				  <title>Code OCR</title>
			  </head>
       
			  <body>
        <div class="container">
          <div id="input_row">
            <label class="custom-file-upload">
              <input type="file" id="image_input" accept="image/png, image/jpg"/>
                Choose image
              <div id="display_image"></div>
            </label>

            <div class="or">
              OR
              <input placeholder="Enter URL" id="input-text"/>
              <button onclick="submitUrl()" class="custom-file-upload" >Submit URL</button>
            </div>
          </div>
        <div id="loading"></div>

        </div>
					  <script>
              const vscode = acquireVsCodeApi();

              function submitUrl(){
                const input = document.getElementById("input-text").value;
                vscode.postMessage({
                  command: 'alert',
                  text: input
                });
              }
  
              const image_input = document.querySelector("#image_input");
  
              image_input.addEventListener("change", function() {
                const reader = new FileReader();
                reader.addEventListener("load", () => {
                  vscode.postMessage({
                    command: 'alert',
                    text: reader.result
                })
              });
                reader.readAsDataURL(this.files[0]);
              });

              window.addEventListener('message', event => {
                const message = event.data; 
                if(message.loading === true){
                  document.querySelector("#loading").innerHTML="‎‎";
                } else {
                  document.querySelector("#loading").innerHTML = "";
                }
            });
    
              
					  </script>
				  </body>
			  </html>`;
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}
