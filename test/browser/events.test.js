import { createElement, render } from 'preact';
import {
	setupScratch,
	teardown,
	supportsPassiveEvents
} from '../_util/helpers';

/** @jsx createElement */

describe('event handling', () => {
	let scratch, proto;

	function fireEvent(on, type) {
		let e = document.createEvent('Event');
		e.initEvent(type, true, true);
		on.dispatchEvent(e);
	}

	beforeEach(() => {
		scratch = setupScratch();

		proto = document.createElement('div').constructor.prototype;

		sinon.spy(proto, 'addEventListener');
		sinon.spy(proto, 'removeEventListener');
	});

	afterEach(() => {
		teardown(scratch);

		proto.addEventListener.restore();
		proto.removeEventListener.restore();
	});

	it('should only register on* functions as handlers', () => {
		let click = () => {},
			onclick = () => {};

		render(<div click={click} onClick={onclick} />, scratch);

		expect(scratch.childNodes[0].attributes.length).to.equal(0);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'click',
			sinon.match.func,
			false
		);
	});

	it('should only register truthy values as handlers', () => {
		function fooHandler() {}
		const falsyHandler = false;

		render(<div onClick={falsyHandler} onOtherClick={fooHandler} />, scratch);

		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'otherclick',
			sinon.match.func,
			false
		);

		expect(proto.addEventListener).not.to.have.been.calledWith('Click');
		expect(proto.addEventListener).not.to.have.been.calledWith('click');
	});

	it('should support native event names', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		render(<div onclick={() => click(1)} onmousedown={mousedown} />, scratch);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('click')
			.and.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).to.have.been.calledOnce.and.calledWith(1);
	});

	it('should support camel-case event names', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('click')
			.and.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).to.have.been.calledOnce.and.calledWith(1);
	});

	it('should update event handlers', () => {
		let click1 = sinon.spy();
		let click2 = sinon.spy();

		render(<div onClick={click1} />, scratch);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click1).to.have.been.calledOnce;
		expect(click2).to.not.have.been.called;

		click1.resetHistory();
		click2.resetHistory();

		render(<div onClick={click2} />, scratch);

		fireEvent(scratch.childNodes[0], 'click');
		expect(click1).to.not.have.been.called;
		expect(click2).to.have.been.called;
	});

	it('should remove event handlers', () => {
		let click = sinon.spy(),
			mousedown = sinon.spy();

		render(<div onClick={() => click(1)} onMouseDown={mousedown} />, scratch);
		render(<div onClick={() => click(2)} />, scratch);

		expect(proto.removeEventListener).to.have.been.calledWith('mousedown');

		fireEvent(scratch.childNodes[0], 'mousedown');
		expect(mousedown).not.to.have.been.called;

		proto.removeEventListener.resetHistory();
		click.resetHistory();
		mousedown.resetHistory();

		render(<div />, scratch);

		expect(proto.removeEventListener).to.have.been.calledWith('click');

		fireEvent(scratch.childNodes[0], 'click');
		expect(click).not.to.have.been.called;
	});

	it('should register events not appearing on dom nodes', () => {
		let onAnimationEnd = () => {};

		render(<div onanimationend={onAnimationEnd} />, scratch);
		expect(
			proto.addEventListener
		).to.have.been.calledOnce.and.to.have.been.calledWithExactly(
			'animationend',
			sinon.match.func,
			false
		);
	});

	// Skip test if browser doesn't support passive events
	if (supportsPassiveEvents()) {
		it('should use capturing for event props ending with *Capture', () => {
			let click = sinon.spy();

			render(
				<div onClickCapture={click}>
					<button type="button">Click me</button>
				</div>,
				scratch
			);

			let btn = scratch.firstChild.firstElementChild;
			btn.click();

			expect(click, 'click').to.have.been.calledOnce;

			// IE doesn't set it
			if (!/Edge/.test(navigator.userAgent)) {
				expect(click).to.have.been.calledWithMatch({ eventPhase: 0 }); // capturing
			}
		});

		it('should support both capturing and non-capturing events on the same element', () => {
			let click = sinon.spy(),
				clickCapture = sinon.spy();

			render(
				<div onClick={click} onClickCapture={clickCapture}>
					<button />
				</div>,
				scratch
			);

			let root = scratch.firstChild;
			root.firstElementChild.click();

			expect(clickCapture, 'click').to.have.been.calledOnce;
			expect(click, 'click').to.have.been.calledOnce;
		});
	}

	// Uniquely named in that the base event names end with 'Capture'
	it('should support (got|lost)PointerCapture events', () => {
		let gotPointerCapture = sinon.spy(),
			gotPointerCaptureCapture = sinon.spy(),
			lostPointerCapture = sinon.spy(),
			lostPointerCaptureCapture = sinon.spy();

		render(
			<div
				onGotPointerCapture={gotPointerCapture}
				onLostPointerCapture={lostPointerCapture}
			/>,
			scratch
		);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('gotpointercapture')
			.and.calledWith('lostpointercapture');

		proto.addEventListener.resetHistory();

		render(
			<div
				onGotPointerCaptureCapture={gotPointerCaptureCapture}
				onLostPointerCaptureCapture={lostPointerCaptureCapture}
			/>,
			scratch
		);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('gotpointercapture')
			.and.calledWith('lostpointercapture');
	});

	it('should support camel-case focus event names', () => {
		render(<div onFocusIn={() => {}} onFocusOut={() => {}} />, scratch);

		expect(proto.addEventListener)
			.to.have.been.calledTwice.and.to.have.been.calledWith('focusin')
			.and.calledWith('focusout');
	});
});
