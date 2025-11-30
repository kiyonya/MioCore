#include <napi.h>
#include <windows.h>
#include <vector>
#include <string>
#include <codecvt>
#include <locale>

struct WindowInfo {
    DWORD pid;
    HWND hwnd;
};

std::vector<WindowInfo> g_windows;

BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    DWORD processId;
    GetWindowThreadProcessId(hwnd, &processId);
    
    if (IsWindowVisible(hwnd)) {
        g_windows.push_back({processId, hwnd});
    }
    
    return TRUE;
}

Napi::Boolean HasWindowByPid(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    
    g_windows.clear();
    EnumWindows(EnumWindowsProc, 0);
    
    for (const auto& window : g_windows) {
        if (window.pid == pid) {
            return Napi::Boolean::New(env, true);
        }
    }
    
    return Napi::Boolean::New(env, false);
}

std::wstring Utf8ToWide(const std::string& utf8Str) {
    if (utf8Str.empty()) return L"";
    
    int wideSize = MultiByteToWideChar(CP_UTF8, 0, utf8Str.c_str(), -1, nullptr, 0);
    if (wideSize == 0) return L"";
    
    std::wstring wideStr(wideSize, 0);
    MultiByteToWideChar(CP_UTF8, 0, utf8Str.c_str(), -1, &wideStr[0], wideSize);
    
    // 移除末尾的 null 终止符
    if (!wideStr.empty() && wideStr[wideStr.length() - 1] == L'\0') {
        wideStr.pop_back();
    }
    
    return wideStr;
}

Napi::Boolean SetWindowTitleByPid(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Expected arguments: (pid: number, title: string)").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }
    
    DWORD pid = info[0].As<Napi::Number>().Uint32Value();
    std::string utf8Title = info[1].As<Napi::String>().Utf8Value();
    std::wstring newTitle = Utf8ToWide(utf8Title);
    
    g_windows.clear();
    EnumWindows(EnumWindowsProc, 0);
    
    bool success = false;
    
    for (const auto& window : g_windows) {
        if (window.pid == pid) {
            // 使用宽字符版本 SetWindowTextW 来支持中文
            if (SetWindowTextW(window.hwnd, newTitle.c_str())) {
                success = true;
            }
        }
    }
    
    return Napi::Boolean::New(env, success);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("hasWindowByPid", Napi::Function::New(env, HasWindowByPid, "hasWindowByPid"));
    exports.Set("setWindowTitleByPid", Napi::Function::New(env, SetWindowTitleByPid, "setWindowTitleByPid"));
    return exports;
}

NODE_API_MODULE(pid_window_checker, Init)