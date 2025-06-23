/**
 * @typedef {{x: number, y: number}} Point 
 * @typedef {Point & {width: number, height: number}} Rectangle 
 */

/**
 * @param {CanvasRenderingContext2D} destCtx 
 * @param {Point} destPoint 
 * @param {CanvasRenderingContext2D} srcCtx 
 * @param {Rectangle} srcRect 
 */
function copyImageData(destCtx, destPoint, srcCtx, srcRect) {
    const { x, y, width, height } = srcRect;
    const srcImageData = srcCtx.getImageData(x, y, width, height);
    destCtx.putImageData(srcImageData, destPoint.x, destPoint.y);
}

/**
 * 
 * @param {CanvasRenderingContext2D} destCtx 
 * @param {Point} destFramePos 
 * @param {number} destFrameSize 
 * @param {CanvasRenderingContext2D} srcCtx 
 * @param {Point} srcFramePos 
 * @param {number} srcFrameSize 
 */
function copyFrame(destCtx, destFramePos, destFrameSize, srcCtx, srcFramePos, srcFrameSize) {
    const offSet = (destFrameSize - srcFrameSize) / 2;
    copyImageData(destCtx, {
        x: destFramePos.x + offSet,
        y: destFramePos.y + offSet
    }, srcCtx, {
        x: srcFramePos.x,
        y: srcFramePos.y,
        width: srcFrameSize,
        height: srcFrameSize
    })
}