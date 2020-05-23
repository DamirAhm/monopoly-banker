const concatURL = ( ...urls ) => {
    if ( urls.length === 0 ) { return "" };
    let result = urls[ 0 ].match( /https?/ ) !== null ? "" : document.location.protocol + "//";

    for ( const url of urls ) {
        if ( url.startsWith( "/" ) && result.endsWith( "/" ) ) {
            result += url.slice( 1 );
        }
        else if ( !url.startsWith( "/" ) && !result.endsWith( "/" ) && result !== "" ) {
            result += "/" + url;
        }
        else {
            result += url;
        }
    }

    return result;
}