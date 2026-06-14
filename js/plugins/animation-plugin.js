import { AnimationsPanelController } from '../panels/animations.js';

export class AnimationPlugin {
  constructor() {
    this.id = 'animation';
    this.name = 'Visual Animation Panel';
    this.version = '1.0.0';
  }

  install(builder) {
    this.builder = builder;
    
    // Instantiate the animations panel controller
    this.controller = new AnimationsPanelController();
  }
}
