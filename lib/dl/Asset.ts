
export interface Asset {

    id: string
    size: number
    hash: string
    url: string
    path: string
    algo?: HashAlgo

}

export enum HashAlgo {
    SHA1 = 'sha1',
    MD5 = 'md5'
}
