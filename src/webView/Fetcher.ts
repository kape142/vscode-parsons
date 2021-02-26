export default interface Fetcher{
    log: (data: string | object) => void
    post: (data: string | object) => void
}