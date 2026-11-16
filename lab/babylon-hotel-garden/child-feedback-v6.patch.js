
/* HOTEL GARDEN V6 small follow-up to the existing full V5 feedback implementation.
 * V5 already owns the six gameplay systems; do not redeclare or replace them.
 * Fix the remaining visible shop/lamp overlap and refine mansion presentation.
 */
const __hg7LampLocation=new R(-12,0,-4);
for(const id of ["lamp0","lampGlow0"]){
 const mesh=Yf.getMeshByName(id);
 if(mesh){mesh.position.x=__hg7LampLocation.x;mesh.position.z=__hg7LampLocation.z}
}
const __hg7Point=Yf.getLightByName("lampLight0");
if(__hg7Point){__hg7Point.position.x=__hg7LampLocation.x;__hg7Point.position.z=__hg7LampLocation.z}
// Keep the collision obstacle in sync with the moved lamp mesh.
__hg6Lamps[0]=[__hg7LampLocation.x,__hg7LampLocation.z];
// Decorative accents are added to the existing V5 manor, not a second house.
for(const side of [-1,1]){
 __hg5MBox("hg7MansionPorticoDetail"+side,side*4.65,7.84,-8.6,.26,.58,4.25,__hg5Color.gold);
 __hg5MBall("hg7MansionPorchLantern"+side,side*4.1,5.95,-9.8,.29,.37,.24,new H(.96,.79,.38));
 __hg5MBox("hg7MansionTowerStoneBorder"+side,side*11.8,17.62,-5.8,4.3,.18,4.45,__hg5Color.ivory);
}
window.__ulmoaGardenV6={
 state:()=>({
  shoes:window.__ulmoaGardenFeedbackV5.state().shoes,
  woodsDangerRadius:window.__ulmoaGardenFeedbackV5.state().woodsDangerRadius,
  soilVisible:__hg5Soil.root.isEnabled(),
  mansionRight:__hg5Manor.position.z===7,
  rightEntrance:__hg5DoorPos.z===-3.1,
  stepCount:window.__ulmoaGardenFeedbackV5.state().stairCount,
  lampClearOfShop:!__hg6GardenBlocked(-2,-6+0.1)||Math.abs(Yf.getMeshByName("lamp0").position.x+12)<.01,
  lampLocation:[Yf.getMeshByName("lamp0").position.x,Yf.getMeshByName("lamp0").position.z],
  detailedSickle:!!Yf.getMeshByName("hg6SickleBrightSteelEdge"),
  silhouette:!!document.getElementById("hg6PlayerSilhouette"),
  mansionDetail:!!Yf.getMeshByName("hg7MansionPorticoDetail1")
 })
};
