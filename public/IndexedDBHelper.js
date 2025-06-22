/**
 * IndexedDB 작업을 쉽게 처리할 수 있도록 돕는 재사용 가능한 헬퍼 클래스입니다.
 */
export class IndexedDBHelper {
    #db = null; // Private class field로 데이터베이스 연결 객체를 관리
    #dbName;
    #storeName;

    /**
     * @param {string} dbName 사용할 데이터베이스의 이름
     * @param {string} storeName 사용할 객체 저장소(Object Store)의 이름
     */
    constructor(dbName, storeName) {
        if (!dbName || !storeName) {
            throw new Error('데이터베이스 이름과 저장소 이름은 필수입니다.');
        }
        this.#dbName = dbName;
        this.#storeName = storeName;
    }

    /**
     * 데이터베이스에 연결하고 초기화합니다.
     * @returns {Promise<IDBDatabase>} 연결된 데이터베이스 객체를 담은 Promise
     */
    connect() {
        return new Promise((resolve, reject) => {
            // 이미 연결된 경우 기존 연결을 반환
            if (this.#db) {
                return resolve(this.#db);
            }

            const request = indexedDB.open(this.#dbName, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.#storeName)) {
                    db.createObjectStore(this.#storeName);
                }
            };

            request.onsuccess = (event) => {
                this.#db = event.target.result;
                console.log(`IndexedDB '${this.#dbName}'에 성공적으로 연결되었습니다.`);
                resolve(this.#db);
            };

            request.onerror = (event) => {
                console.error(`IndexedDB 오류: ${event.target.errorCode}`);
                reject(event.target.error);
            };
        });
    }

    /**
     * 트랜잭션을 생성하는 내부 헬퍼 함수
     * @param {'readonly' | 'readwrite'} mode 트랜잭션 모드
     * @returns {IDBObjectStore} 객체 저장소
     */
    async #getTransactionStore(mode) {
        const db = await this.connect();
        const transaction = db.transaction([this.#storeName], mode);
        return transaction.objectStore(this.#storeName);
    }

    /**
     * 지정된 키를 사용하여 데이터를 저장하거나 업데이트합니다.
     * @param {IDBValidKey} key 저장할 데이터의 키
     * @param {any} value 저장할 데이터
     * @returns {Promise<void>} 작업 완료를 나타내는 Promise
     */
    async put(key, value) {
        const store = await this.#getTransactionStore('readwrite');
        const request = store.put(value, key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * 지정된 키를 사용하여 데이터를 조회합니다.
     * @param {IDBValidKey} key 조회할 데이터의 키
     * @returns {Promise<any | null>} 조회된 데이터 또는 null을 담은 Promise
     */
    async get(key) {
        const store = await this.#getTransactionStore('readonly');
        const request = store.get(key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * 지정된 키의 데이터를 삭제합니다.
     * @param {IDBValidKey} key 삭제할 데이터의 키
     * @returns {Promise<void>} 작업 완료를 나타내는 Promise
     */
    async delete(key) {
        const store = await this.#getTransactionStore('readwrite');
        const request = store.delete(key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * 객체 저장소의 모든 데이터를 삭제합니다.
     * @returns {Promise<void>} 작업 완료를 나타내는 Promise
     */
    async clear() {
        const store = await this.#getTransactionStore('readwrite');
        const request = store.clear();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}