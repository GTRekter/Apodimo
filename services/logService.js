const colors = require('colors');

class LogService {
    isVerbose = false;
    constructor(verbose) {
        this.isVerbose = verbose
    }
    general(string) {
        console.log(`${string}`.blue);
    }
    info(string) {
        console.log(`[Info] ${string}`.blue);
    }
    verbose(string) {
        if(this.isVerbose) {
            console.log(`[Verbose] ${string}`.white);
        }
    }
    warning(string) {
        console.log(`[Warning] ${string}`.yellow);
    }
    error(string) {
        console.log(`[Error] ${string}`.red);
    }
}
module.exports = LogService;