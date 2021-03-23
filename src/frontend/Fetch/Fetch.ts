import { Fetcher } from "../../model";

export default class Fetch implements Fetcher{
    private send: (type: string, text: string | object) => void;
    constructor(send: (type: string, text: string | object) => void){
        this.send = send;
    }

    log(data: string | object){
        this.send("log", data);
    }

    message(data: string | object, type: string = "message"){
        this.send(type, data);
    }
    
    
}