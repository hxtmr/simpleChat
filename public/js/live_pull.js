var MAX_TIME = 999999999999
window.bufferEqual=function (b1,b2) {
    window.hasEqual=true
    var len=Math.min(b1.byteLength,b2.byteLength,10000)
    var dv1 = new DataView(b1);
    var dv2 = new DataView(b2);
    for(var i=0;i<len;i++){
        console.log('index:',i,dv1.getUint8(i),dv2.getUint8(i),dv1.getUint8(i)==dv2.getUint8(i))

    }

}
window.hasEqual=false;
/**
 * Creates a new Uint8Array based on two different ArrayBuffers
 *
 * @private
 * @param {ArrayBuffers} buffer1 The first buffer.
 * @param {ArrayBuffers} buffer2 The second buffer.
 * @return {ArrayBuffers} The new ArrayBuffer created out of the two.
 */
var _appendBuffer=window._appendBuffer = function(bufferArray, buffer2) {
    bufferArray.push(buffer2)
    var count=bufferArray.length;
    var buffLen=0,offset=0;
    for(var i=0;i<count;i++){
        buffLen+=bufferArray[i].byteLength
    }
    var tmp = new Uint8Array(buffLen);
    for(var i=0;i<count;i++){
        tmp.set(new Uint8Array(bufferArray[i]), offset);
        offset+=bufferArray[i].byteLength;
    }
    return tmp.buffer;
};

//multiStreamRecorder = new MultiStreamRecorder([stream, stream]);
//mediaRecorder = new MediaStreamRecorder(stream);
$(document).ready(function () {
    var nV=$('<video class="live_video" controls muted autoplay style="border: 1px solid;"></video>')
    $('body').append(nV)

    var msource = new MediaSource();
    var catchedBuffer = [];

    nV[0].src = URL.createObjectURL(msource);
    var nbuffer;
    msource.addEventListener('sourceopen', function () {
        nbuffer = msource.addSourceBuffer("video/webm;codecs=vp9,opus");
        nbuffer.hasAddHeader=false;
        //sourceBuffer.mode="sequence";
        nbuffer.addEventListener('error', function (e) {
            // console.log(e)
        })
        nbuffer.addEventListener('updateend', function (_) {
            //console.log('end')
            //source.endOfStream();
            var promise = nV[0].play();
            if (promise !== undefined) {
                promise.then(_ => {

                }).catch(error => {
                })
            };

        });
    })
    const socket =io.connect()

    socket.on('connect',function () {
        console.log('connect')
    })
    window.videoBuffers=[]

    function edgeBuffer(ber,hdata){
        var tmp=new Uint8Array(ber.byteLength),clusterPos=-1;
        tmp.set(new Uint8Array(ber));
        if(tmp[0]==26&&tmp[1]==69&&tmp[2]==223&&tmp[3]==163){
            nbuffer.hasAddHeader=true
            return ber;
        }
        for(var i=0;i<tmp.byteLength;i++){
            if(tmp[i]==31&&tmp[i+1]==67&&tmp[i+2]==182&&tmp[i+3]==117){
                clusterPos=i;
                break;
            }
        }
        if(clusterPos==-1)return null;
       // console.log(123,clusterPos)
        var initSegBuffer=new Uint8Array(ber.byteLength-clusterPos)
        initSegBuffer.set(new Uint8Array(ber,clusterPos))
       // console.log(initSegBuffer)
        nV[0].currentTime=MAX_TIME;
        initSegBuffer=_appendBuffer([hdata],initSegBuffer);
        nbuffer.hasAddHeader=true
        //console.log(initSegBuffer)
        return initSegBuffer
    }


    socket.on('videobuffer',function (data) {
       // console.log(data)
        var buffer=data[0]
        if (nbuffer.updating !== true) {
            try {
                if (catchedBuffer.length >= 1) {
                    var mbuffer=_appendBuffer(catchedBuffer,buffer)
                    catchedBuffer=[]
                    window.videoBuffers.push(mbuffer)
                    if(nbuffer.hasAddHeader==false){
                        mbuffer=edgeBuffer(mbuffer,data[1])
                    }
                    if(mbuffer)
                        nbuffer.appendBuffer(mbuffer)
                    //socket.emit('receiveBuffer' ,mbuffer);
                }else{
                    window.videoBuffers.push(buffer)
                    if(nbuffer.hasAddHeader==false){
                        buffer=edgeBuffer(buffer,data[1])
                    }
                    if(buffer)
                        nbuffer.appendBuffer(buffer)
                    // socket.emit('receiveBuffer' ,buffer);
                }
            } catch (e) {
                console.log(e)
            }

        } else {
            catchedBuffer.push(buffer)
        }

    })
});