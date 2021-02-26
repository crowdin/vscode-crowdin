export class CommonUtil {

    static toPromise<T>(thenable: Thenable<T>): Promise<T> {
        return new Promise((res, rej) => {
            thenable.then(
                (v) => res(v),
                (e) => rej(e)
            );
        });
    }
}