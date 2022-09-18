'use strict'
/*
   askForPromise Description
   ========================
   Returns object with promise and resolve function.

*/

module.exports = askForPromise




function askForPromise ( list ) {
   let  
         isList = false
       , askObject
       ;
   
   if ( list ) {
                askObject = _manyPromises ( list )
                isList = true
        } 
   else         askObject = _singlePromise ();

   askObject.timeout = _timeout ( isList, askObject )   
   return askObject
 } // askForPromise func.



function _singlePromise () {
  let  done, cancel;
  const x = new Promise ( (resolve, reject ) => { 
                                                  done   = resolve
                                                  cancel = reject
                                 })

   return { 
               promise    : x
             , done       : done 
             , cancel     : cancel
             , onComplete : _after(x)
           }
   } // _singlePromise func.



 function _manyPromises ( list ) {
                                    let askObject = list.map ( el => _singlePromise() )
                                    let askList   = askObject.map ( o => o.promise )
                                    
                                    askObject [ 'promises'   ] = askList
                                    askObject [ 'onComplete' ] = _after ( Promise.all (askList) )
                                    return askObject
   } // _manyPromises func.



 function _after (x) {
    return function ( fx ) {
                x.then ( res => fx(res)   )
       }}



function _timeout ( isList, askObject ) {
      let main;
      
      if ( isList ) main = Promise.all( askObject.promises );
      else          main = askObject.promise;

      return function ( ttl, expMsg ) {
                let timer;
                let timeout = new Promise ( (resolve, reject) => {
                                        timer = setTimeout ( () => {
                                                        resolve ( expMsg )
                                                        Promise.resolve ( main )
                                                    }, ttl)
                                    }); // timeout
                main.then ( () => clearTimeout(timer)   )                
                askObject [ 'onComplete'] = _after ( Promise.race ([main, timeout])   )
                return askObject
            }
    } // _timeout func.

