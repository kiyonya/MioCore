import axios, { type AxiosResponse, type AxiosRequestConfig } from "axios";

export default class Request {
    public static async post<T = any>(
        url: string,
        data: any,
        options: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {

        let retryTimes: number = 5;
        const wait = 500;

        const doRequest = async (): Promise<AxiosResponse<T>> => {
            try {
                return await axios.post<T>(url, data, options);
            } catch (err) {
                if (retryTimes <= 0) {
                    throw err;
                }
                retryTimes--;
                await Request.sleep(wait);
                return doRequest();
            }
        };

        return doRequest();
    }

    public static async get<T = any>(
        url: string,
        options: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        let retryTimes: number = 5;
        const wait = 500;

        const doRequest = async (): Promise<AxiosResponse<T>> => {
            try {
                return await axios.get<T>(url, options);
            } catch (err) {
                if (retryTimes <= 0) {
                    throw err;
                }
                retryTimes--;
                await Request.sleep(wait);
                return doRequest();
            }
        };

        return doRequest();
    }

    protected static sleep(time: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, time));
    }
}



