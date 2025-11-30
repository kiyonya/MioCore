#include <napi.h>
#include <vector>
#include <string>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/Xatom.h>
#include <iostream>
#include <cstring>

struct WindowInfo
{
    unsigned long pid;
    Window window;
};

std::vector<WindowInfo> g_windows;

// 获取窗口的 PID
unsigned long get_window_pid(Display *display, Window window)
{
    Atom actual_type;
    int actual_format;
    unsigned long nitems, bytes_after;
    unsigned char *prop = nullptr;
    Atom pid_atom = XInternAtom(display, "_NET_WM_PID", True);

    if (pid_atom == None)
    {
        return 0;
    }

    int status = XGetWindowProperty(display, window, pid_atom, 0, 1024, False,
                                    XA_CARDINAL, &actual_type, &actual_format,
                                    &nitems, &bytes_after, &prop);

    if (status == Success && prop)
    {
        unsigned long pid = *reinterpret_cast<unsigned long *>(prop);
        XFree(prop);
        return pid;
    }

    return 0;
}

// 枚举所有窗口的回调函数
Bool enum_windows_callback(Display *display, Window window, XPointer arg)
{
    // 检查窗口是否可见
    XWindowAttributes attrs;
    if (XGetWindowAttributes(display, window, &attrs))
    {
        if (attrs.map_state == IsViewable)
        {
            unsigned long pid = get_window_pid(display, window);
            if (pid > 0)
            {
                g_windows.push_back({pid, window});
            }
        }
    }
    return True; // 继续枚举
}

// 检查指定 PID 是否有可见窗口
Napi::Boolean HasWindowByPid(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber())
    {
        Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    unsigned long pid = info[0].As<Napi::Number>().Uint32Value();

    // 打开 X11 显示连接
    Display *display = XOpenDisplay(nullptr);
    if (!display)
    {
        return Napi::Boolean::New(env, false);
    }

    g_windows.clear();

    // 枚举所有窗口
    Window root = DefaultRootWindow(display);
    XQueryTree(display, root, &root, &root, nullptr, nullptr); // 获取根窗口
    XEnumTree(display, root, enum_windows_callback, nullptr);

    // 查找匹配的 PID
    for (const auto &window : g_windows)
    {
        if (window.pid == pid)
        {
            XCloseDisplay(display);
            return Napi::Boolean::New(env, true);
        }
    }

    XCloseDisplay(display);
    return Napi::Boolean::New(env, false);
}

// 自定义的 XEnumTree 函数实现
void XEnumTree(Display *display, Window window,
               Bool (*callback)(Display *, Window, XPointer), XPointer arg)
{
    if (!callback(display, window, arg))
    {
        return;
    }

    Window root, parent;
    Window *children = nullptr;
    unsigned int nchildren;

    if (XQueryTree(display, window, &root, &parent, &children, &nchildren))
    {
        for (unsigned int i = 0; i < nchildren; i++)
        {
            XEnumTree(display, children[i], callback, arg);
        }
        if (children)
        {
            XFree(children);
        }
    }
}

// 设置窗口标题
Napi::Boolean SetWindowTitleByPid(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsString())
    {
        Napi::TypeError::New(env, "Expected arguments: (pid: number, title: string)").ThrowAsJavaScriptException();
        return Napi::Boolean::New(env, false);
    }

    unsigned long pid = info[0].As<Napi::Number>().Uint32Value();
    std::string newTitle = info[1].As<Napi::String>().Utf8Value();

    // 打开 X11 显示连接
    Display *display = XOpenDisplay(nullptr);
    if (!display)
    {
        return Napi::Boolean::New(env, false);
    }

    g_windows.clear();

    // 枚举所有窗口
    Window root = DefaultRootWindow(display);
    XEnumTree(display, root, enum_windows_callback, nullptr);

    bool success = false;
    Atom wm_name = XInternAtom(display, "WM_NAME", False);
    Atom utf8_string = XInternAtom(display, "UTF8_STRING", False);
    Atom net_wm_name = XInternAtom(display, "_NET_WM_NAME", False);

    for (const auto &window_info : g_windows)
    {
        if (window_info.pid == pid)
        {
            // 设置传统 WM_NAME 属性
            XChangeProperty(display, window_info.window, wm_name,
                            XA_STRING, 8, PropModeReplace,
                            reinterpret_cast<const unsigned char *>(newTitle.c_str()),
                            newTitle.length());

            // 设置 UTF-8 格式的 _NET_WM_NAME 属性
            if (utf8_string != None)
            {
                XChangeProperty(display, window_info.window, net_wm_name,
                                utf8_string, 8, PropModeReplace,
                                reinterpret_cast<const unsigned char *>(newTitle.c_str()),
                                newTitle.length());
            }

            // 刷新显示
            XFlush(display);
            success = true;
        }
    }

    XCloseDisplay(display);
    return Napi::Boolean::New(env, success);
}

// 获取窗口标题（额外功能）
Napi::String GetWindowTitleByPid(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsNumber())
    {
        Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
        return Napi::String::New(env, "");
    }

    unsigned long pid = info[0].As<Napi::Number>().Uint32Value();

    Display *display = XOpenDisplay(nullptr);
    if (!display)
    {
        return Napi::String::New(env, "");
    }

    g_windows.clear();
    Window root = DefaultRootWindow(display);
    XEnumTree(display, root, enum_windows_callback, nullptr);

    for (const auto &window_info : g_windows)
    {
        if (window_info.pid == pid)
        {
            // 尝试获取 _NET_WM_NAME (UTF-8)
            Atom net_wm_name = XInternAtom(display, "_NET_WM_NAME", False);
            Atom utf8_string = XInternAtom(display, "UTF8_STRING", False);

            Atom actual_type;
            int actual_format;
            unsigned long nitems, bytes_after;
            unsigned char *prop = nullptr;

            int status = XGetWindowProperty(display, window_info.window, net_wm_name,
                                            0, 1024, False, utf8_string,
                                            &actual_type, &actual_format,
                                            &nitems, &bytes_after, &prop);

            if (status == Success && prop && nitems > 0)
            {
                std::string title(reinterpret_cast<char *>(prop), nitems);
                XFree(prop);
                XCloseDisplay(display);
                return Napi::String::New(env, title);
            }

            // 回退到 WM_NAME
            XTextProperty text_prop;
            if (XGetWMName(display, window_info.window, &text_prop))
            {
                if (text_prop.value && text_prop.nitems > 0)
                {
                    char **list = nullptr;
                    int count = 0;

                    if (XmbTextPropertyToTextList(display, &text_prop, &list, &count) == Success && count > 0)
                    {
                        std::string title(list[0]);
                        XFreeStringList(list);
                        XFree(text_prop.value);
                        XCloseDisplay(display);
                        return Napi::String::New(env, title);
                    }
                    XFree(text_prop.value);
                }
            }
        }
    }

    XCloseDisplay(display);
    return Napi::String::New(env, "");
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
    exports.Set("hasWindowByPid", Napi::Function::New(env, HasWindowByPid));
    exports.Set("setWindowTitleByPid", Napi::Function::New(env, SetWindowTitleByPid));
    exports.Set("getWindowTitleByPid", Napi::Function::New(env, GetWindowTitleByPid));
    return exports;
}

NODE_API_MODULE(pid_window_checker, Init)