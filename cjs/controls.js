(function (root, factory) {
  const ArenaControls = factory();
  if (typeof module === 'object' && module.exports) module.exports = ArenaControls;
  if (root) root.ArenaControls = ArenaControls;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const keyActions = { Space: 'jump', KeyR: 'reload', KeyQ: 'weapon', Digit1: 'weapon1', Digit2: 'weapon2', Digit3: 'weapon3' };
  const heldKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight']);
  return class ArenaControls {
    constructor({ canvas, onPause = () => {}, onAction = () => {}, onLook = () => {}, onActive = () => {} }) {
      this.canvas = canvas;
      this.onPause = onPause; this.onAction = onAction; this.onLook = onLook; this.onActive = onActive;
      this.touch = Boolean(window.matchMedia?.('(pointer:coarse)').matches || navigator.maxTouchPoints > 0);
      this.active = false; this.fire = false; this.keys = new Set();
      this._pads = []; this._firePointer = null; this._wantsActive = false; this._startId = 0;
      document.addEventListener('pointerlockchange', () => {
        const locked = document.pointerLockElement === this.canvas;
        if (locked && (!this._wantsActive || this.touch)) { document.exitPointerLock(); return; }
        if (!this.touch) this._setActive(locked);
      });
      document.addEventListener('mousemove', e => {
        if (this.active && !this.touch && document.pointerLockElement === this.canvas) this.onLook(e.movementX || 0, e.movementY || 0);
      });
      window.addEventListener('keydown', e => {
        if (e.code === 'Escape') { if (this.active) { e.preventDefault(); this.pause(); } return; }
        if (!this.active || this.touch || (!heldKeys.has(e.code) && !keyActions[e.code])) return;
        e.preventDefault();
        if (!e.repeat && !this.keys.has(e.code) && keyActions[e.code]) this.onAction(keyActions[e.code]);
        this.keys.add(e.code);
      });
      window.addEventListener('keyup', e => { this.keys.delete(e.code); });
      this.canvas.addEventListener('mousedown', e => {
        if (!this.active || this.touch) return;
        if (e.button === 0) this.fire = true;
        if (e.button === 2) { e.preventDefault(); this.onAction('secondary'); }
      });
      window.addEventListener('mouseup', e => { if (e.button === 0 && !this.touch) this.fire = false; });
      this.canvas.addEventListener('contextmenu', e => e.preventDefault());
      window.addEventListener('blur', () => this.pause());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
      this._bindPad('move-pad', 'move'); this._bindPad('look-pad', 'look');
      this._fireButton = document.getElementById('touch-fire');
      if (this._fireButton) {
        this._fireButton.addEventListener('pointerdown', e => {
          if (!this.active || !this.touch || this._firePointer !== null) return;
          e.preventDefault(); this._firePointer = e.pointerId; this.fire = true;
          this._fireButton.setPointerCapture(e.pointerId);
        });
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) this._fireButton.addEventListener(name, e => {
          if (e.pointerId !== this._firePointer) return;
          this._firePointer = null; this.fire = false;
          this._release(this._fireButton, e.pointerId);
        });
      }
      for (const action of ['jump', 'reload', 'secondary', 'crouch', 'weapon']) {
        document.getElementById('touch-' + action)?.addEventListener('pointerdown', e => {
          if (this.active && this.touch) { e.preventDefault(); this.onAction(action); }
        });
      }
      document.getElementById('pause-button')?.addEventListener('click', () => this.pause());
    }

    _setActive(value) {
      if (!value) this.clear();
      if (this.active === value) return;
      this.active = value; this.onActive(value);
      if (!value) { this._wantsActive = false; this.onPause(); }
    }

    async start() {
      if (this.active) return;
      this._cancelStart?.();
      const startId = ++this._startId;
      this.clear(); this._wantsActive = true;
      if (this.touch) { this._setActive(true); return; }
      if (!this.canvas.requestPointerLock) { this._wantsActive = false; throw new Error('Pointer lock is unavailable; choose touch controls.'); }
      try {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            document.removeEventListener('pointerlockchange', changed);
            document.removeEventListener('pointerlockerror', failed);
            if (this._cancelStart === cancelled) this._cancelStart = null;
          };
          const changed = () => { if (document.pointerLockElement === this.canvas) { cleanup(); resolve(); } };
          const failed = () => { cleanup(); reject(new Error('Pointer lock was denied; try starting again or choose touch controls.')); };
          const cancelled = () => { cleanup(); reject(new Error('Start cancelled.')); };
          this._cancelStart = cancelled;
          document.addEventListener('pointerlockchange', changed);
          document.addEventListener('pointerlockerror', failed);
          try {
            const request = this.canvas.requestPointerLock();
            if (request?.then) request.then(changed, error => { cleanup(); reject(error); });
          } catch (error) { cleanup(); reject(error); }
        });
      } catch (error) {
        if (startId === this._startId) { this._wantsActive = false; this._setActive(false); }
        throw error;
      }
    }

    pause() {
      ++this._startId; this._cancelStart?.();
      this._wantsActive = false; this._setActive(false);
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    }

    setTouch(value) { this.pause(); this.touch = Boolean(value); }

    _release(element, pointerId) {
      if (pointerId !== null && element?.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    }

    clear() {
      this.keys.clear(); this.fire = false;
      const firePointer = this._firePointer; this._firePointer = null;
      this._release(this._fireButton, firePointer);
      for (const pad of this._pads) this._resetPad(pad);
    }

    _resetPad(pad) {
      const id = pad.pointerId; pad.pointerId = null; pad.x = 0; pad.y = 0;
      if (pad.stick) pad.stick.style.transform = 'translate(-50%, -50%)';
      this._release(pad.element, id);
    }

    _bindPad(id, kind) {
      const element = document.getElementById(id);
      if (!element) return;
      const pad = { element, kind, stick: element.querySelector('.stick'), pointerId: null, x: 0, y: 0 };
      this._pads.push(pad);
      const update = e => {
        const rect = element.getBoundingClientRect();
        const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.35);
        const x = (e.clientX - rect.left - rect.width / 2) / radius;
        const y = (e.clientY - rect.top - rect.height / 2) / radius;
        const length = Math.hypot(x, y),deadZone=.1;
        // Rescale the remaining travel so tiny finger motion rests at zero,
        // while the outer edge still reaches full walking/turning speed.
        const scale=length<=deadZone?0:(Math.min(1,length)-deadZone)/(1-deadZone)/length;
        pad.x = x * scale; pad.y = y * scale;
        if (pad.stick) pad.stick.style.transform = `translate(calc(-50% + ${pad.x * radius}px), calc(-50% + ${pad.y * radius}px))`;
      };
      element.addEventListener('pointerdown', e => {
        if (!this.active || !this.touch || pad.pointerId !== null) return;
        e.preventDefault(); pad.pointerId = e.pointerId; element.setPointerCapture(e.pointerId); update(e);
      });
      element.addEventListener('pointermove', e => { if (e.pointerId === pad.pointerId) { e.preventDefault(); update(e); } });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(name, e => {
        if (e.pointerId === pad.pointerId) this._resetPad(pad);
      });
    }

    axes() {
      if (!this.active) return { forward: 0, right: 0, lookX: 0, lookY: 0 };
      if (this.touch) {
        const move = this._pads.find(p => p.kind === 'move'); const look = this._pads.find(p => p.kind === 'look');
        return { forward: -(move?.y || 0) || 0, right: move?.x || 0, lookX: look?.x || 0, lookY: look?.y || 0 };
      }
      const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
      const right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
      const length = Math.max(1, Math.hypot(forward, right));
      return { forward: forward / length, right: right / length, lookX: 0, lookY: 0 };
    }
  };
});
