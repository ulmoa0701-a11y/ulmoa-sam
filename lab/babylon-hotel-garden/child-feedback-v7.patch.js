/* HOTEL GARDEN V7: attach visible night light to the animated hand;
   keep torch illumination independent of the global day/night lighting pass;
   release held movement when the browser loses focus. */
const __hg8BeamLength=6.6;
Yf.onBeforeRenderObservable.add(()=>{
  // Vm() updates EVERY point light, so restore the hand torch's own intensity
  // every frame AFTER the previous scene/day-night render callbacks.
  __hg7Light.intensity=__hg7NightOn?1.45:0;
  if(!__hg7NightOn)return;
  Rp.computeWorldMatrix(true);
  __hg7FlashLens.computeWorldMatrix(true);
  const origin=__hg7FlashLens.getAbsolutePosition();
  const local=R.TransformCoordinates(origin,Rp.getWorldMatrix().clone().invert());
  // The narrow end of the cone starts at the flashlight lens; its wide end
  // projects forward, even when the arm swings during walking.
  __hg7Beam.position.set(local.x,local.y,local.z+__hg8BeamLength/2);
  const facing=Rp.rotation.y;
  __hg7Light.position.set(origin.x+Math.sin(facing)*2.6,origin.y+.05,origin.z+Math.cos(facing)*2.6);
});
function __hg8ReleaseMovement(){
  Gp.up=Gp.down=Gp.left=Gp.right=false;
  __hgSprinting=false;
}
window.addEventListener("blur",__hg8ReleaseMovement);
document.addEventListener("visibilitychange",()=>{if(document.hidden)__hg8ReleaseMovement()});
// Browser QA only: read-only state of actual meshes and controls.
window.__ulmoaGardenFeedbackV7={
  state:()=>{
    const w=__hg7FlashLens.getAbsolutePosition();
    const l=R.TransformCoordinates(w,Rp.getWorldMatrix().clone().invert());
    const emitter=__hg7Beam.position.subtract(new R(0,0,__hg8BeamLength/2));
    return {
      torchOn:__hg7NightOn,
      torchBodyEnabled:__hg7FlashBody.isEnabled(),
      torchBeamEnabled:__hg7Beam.isEnabled(),
      torchGlowIntensity:+__hg7Light.intensity.toFixed(3),
      beamStartsAtHand:+R.Distance(emitter,l).toFixed(4),
      movementKeysHeld:Object.values({up:Gp.up,down:Gp.down,left:Gp.left,right:Gp.right}).some(Boolean)
    };
  },
  version:"child-playtest-v7"
};
