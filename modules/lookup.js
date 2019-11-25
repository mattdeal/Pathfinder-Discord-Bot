const Pageres = require('pageres');
const curl = require('curlrequest');
const tmp = require('tmp');

class lookup {
    constructor (client) {
        client.on('message', message => {
            if (message.content.startsWith('!lookup')) {
                lookupTerm(message);
            }   
        });
        client.on('messageUpdate', (oldMessage, newMessage) => {
            if (newMessage.content.startsWith('!lookup')) {
                lookupTerm(newMessage);
            }   
        });
        console.log('Successfully loaded lookup plugin.');
    }
}
function lookupTerm(message) {
    var ID=0;
    var searchResults = [];
    var tmpdir = tmp.dirSync();
    
    const findSearchTerm = /!lookup ([\w ]+)\(?(\d+)?\)?/i;
    var foo = message.content.match(findSearchTerm);
    console.log(foo);
    var searchTerm = foo[1];
    if (foo.length > 1)
        var disambiguousSelector = foo[2];

    var disambiguousMessage = "Please select the correct result by editing your previous message with the selection in parenthesis at the end:\n\n";
    var disambiguousMessageCount = 0;
    const findID = /value='(\d+)'/i;
    const findResult = new RegExp("<strong>(" + searchTerm + ")</strong>.*<small>(.*?)</small>.*value='(\\d+?)'","mis");
    const findResultExtended = new RegExp("<strong>(.*?)</strong>.*<small>(.*?)</small>.*value='(\\d+?)'","mis");

    curl.request({url: 'http://pf2.easytool.es/php/search.php', method:'POST', data:'name='+searchTerm}, async function (err,response) {
    
        responses = response.split('<button'); 
        console.log("Got " + responses.length-1 + " entries back from EasyTools");
        for (foo of responses) {
            result = findResult.exec(foo);
            if (result) {
                searchResults.push(result);
                disambiguousMessageCount++;
                disambiguousMessage = disambiguousMessage + "(" + disambiguousMessageCount + ") " + result[1] + ' - ' + result[2] + "\n";
            }
        }
        console.log(searchResults);
        if (!searchResults || searchResults.length == 0) {
            console.log("Couldn't find any exact matches, lets try an extended search...");
            for (foo of responses) {
                result = findResultExtended.exec(foo);
                if (result) {
                    searchResults.push(result);
                    disambiguousMessageCount++;
                    disambiguousMessage = disambiguousMessage + "(" + disambiguousMessageCount + ") " + result[1] + ' - ' + result[2] + "\n";
                }
            }
        }   
        if (!searchResults || searchResults.length == 0) {
            message.channel.send("Sorry, couldn't find anything when searching for "+searchTerm);
            return;
        }
        
        if (searchResults.length == 1) {
            ID = searchResults[0][3];
        } else if (disambiguousSelector) {
            ID = searchResults[disambiguousSelector-1][3];
        }else {
            message.channel.send(disambiguousMessage);
        }
        console.log(ID);
        
        if (ID > 0) {
            console.log("Getting screenshot...");
            await new Pageres({delay: 0, selector:'article.result', filename:'foo'})
                .src('http://pf2.easytool.es/index.php?id='+ID, ['1024x768'], {crop: true})
                .dest(tmpdir.name)
                .run();
        
            console.log('Saving to ' + tmpdir.name+'/'+'foo.png');
            message.channel.send({files: [{attachment: tmpdir.name+'/'+'foo.png',name:'results.png'}]})
            .catch(console.error);
        }

        tmp.setGracefulCleanup();
    }); 
}


module.exports = (client) => { return new lookup(client) }