import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as os from 'os';

let intervalId: any; // 타이머 ID 저장
let statusBarLanguage: vscode.StatusBarItem; // 상태 표시줄 항목
let originalCursorColor: string | undefined; // 원래 커서 색상 저장

const PLATFORM = os.platform();
const MAC_OS_COMMAND = `defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources`;
const WINDOWS_OS_COMMAND = `Get-WinUserLanguageList | Select-Object -ExpandProperty InputMethodTips`;
const LINUX_OS_COMMAND = `setxkbmap -query | grep layout`;

async function getCurrentKeyboardLanguage() {
  return new Promise((resolve, reject) => {
    let command = '';
    if (PLATFORM === 'darwin') {
      command = MAC_OS_COMMAND;
    } else if (PLATFORM === 'win32') {
      command = WINDOWS_OS_COMMAND;
    } else if (PLATFORM === 'linux') {
      command = LINUX_OS_COMMAND;
    } else {
      return reject('en');
    }

    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject('en');
      }
      const regex = /abc|korea/i;
      const lang = stdout.match(regex);
      if (lang && lang[0].toLowerCase() === 'korea') {
        resolve('ko');
      } else {
        resolve('en');
      }
    });
  });
}

async function changeCursorColor(color: string) {
  await vscode.workspace.getConfiguration().update(
    'workbench.colorCustomizations',
    {
      'editorCursor.foreground': color,
    },
    vscode.ConfigurationTarget.Global
  );
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Your extension "lang-cursor" is now active!');

  originalCursorColor = (
    vscode.workspace
      .getConfiguration('workbench')
      .get('colorCustomizations') as any
  )['editorCursor.foreground'];

  let disposable = vscode.commands.registerCommand(
    'lang-cursor.start',
    async () => {
      statusBarLanguage = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
      );
      statusBarLanguage.show();
      context.subscriptions.push(statusBarLanguage);

      intervalId = setInterval(async () => {
        const res = await getCurrentKeyboardLanguage();
        statusBarLanguage.text = `Keyboard Lang: ${res}`;

        if (res === 'ko') {
          await changeCursorColor('#00ff00');
        } else {
          await changeCursorColor('#ff0000');
        }
      }, 200);

      context.subscriptions.push({
        dispose() {
          clearInterval(intervalId);
        },
      });

      vscode.window.showInformationMessage('Hello World from lang-cursor!');
    }
  );

  let disposable2 = vscode.commands.registerCommand('lang-cursor.stop', () => {
    clearInterval(intervalId);
    statusBarLanguage.dispose();
    statusBarLanguage.hide();
    statusBarLanguage.dispose();
    restoreCursorColor();
    vscode.window.showInformationMessage('Goodbye from lang-cursor!');
  });

  context.subscriptions.push(disposable, disposable2);
}

export async function deactivate() {
  if (intervalId) {
    clearInterval(intervalId);
  }
  if (originalCursorColor) {
    await changeCursorColor(originalCursorColor);
  } else {
    restoreCursorColor();
  }
}

async function restoreCursorColor() {
  await vscode.workspace
    .getConfiguration()
    .update(
      'workbench.colorCustomizations',
      {},
      vscode.ConfigurationTarget.Global
    );
}
