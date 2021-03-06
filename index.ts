const elements = new WeakMap();

function _delegate(
	element: EventTarget,
	selector: string,
	type: string,
	callback?: Function,
	useCapture?: boolean | AddEventListenerOptions
) {
	const listenerFn = event => {
		event.delegateTarget = event.target.closest(selector);

		// Closest may match elements outside of the currentTarget
		// so it needs to be limited to elements inside it
		if (event.delegateTarget && event.currentTarget.contains(event.delegateTarget)) {
			callback.call(element, event);
		}
	};

	const delegateSubscription = {
		destroy() {
			element.removeEventListener(type, listenerFn, useCapture);
			if (!elements.has(element)) {
				return;
			}

			const elementMap = elements.get(element);
			if (!elementMap.has(callback)) {
				return;
			}

			const setups = elementMap.get(callback);
			for (const setup of setups) {
				if (setup.selector !== selector || setup.type !== type || setup.useCapture !== useCapture) {
					continue;
				}
				setups.delete(setup);
				if (setups.size === 0) {
					elementMap.delete(callback);
					if (elementMap.size === 0) {
						elements.delete(element);
					}
				}
				return;
			}
		}
	};

	const elementMap = elements.get(element) || new WeakMap();
	const setups = elementMap.get(callback) || new Set();
	for (const setup of setups) {
		if (setup.selector === selector && setup.type === type && setup.useCapture === useCapture) {
			return delegateSubscription;
		}
	}

	// Remember event in tree
	elements.set(element,
		elementMap.set(callback,
			setups.add({selector, type, useCapture})
		)
	);

	// Add event on delegate
	element.addEventListener(type, listenerFn, useCapture);

	return delegateSubscription;
}

/**
 * Delegates event to a selector.
 */
type CombinedElements = EventTarget | EventTarget[] | NodeListOf<Element> | string;
function delegate(
	selector: string,
	type: string,
	callback?: Function,
	useCapture?: boolean | AddEventListenerOptions
): object;
function delegate(
	elements: CombinedElements,
	selector: string,
	type: string,
	callback?: Function,
	useCapture?: boolean | AddEventListenerOptions
	): object;
function delegate(
	elements,
	selector,
	type,
	callback?,
	useCapture?
) {
	// Handle the regular Element usage
	if (elements instanceof EventTarget) {
		return _delegate(elements, selector, type, callback, useCapture);
	}

	// Handle Element-less usage, it defaults to global delegation
	if (typeof type === 'function') {
		return _delegate(document, elements as string, selector as string, type as Function, callback as boolean | AddEventListenerOptions);
	}

	// Handle Selector-based usage
	if (typeof elements === 'string') {
		elements = document.querySelectorAll(elements);
	}

	// Handle Array-like based usage
	return Array.prototype.map.call(elements, (element: EventTarget) => {
		return _delegate(element, selector, type, callback, useCapture);
	});
}

export default delegate;

// For CommonJS default export support
module.exports = delegate;
module.exports.default = delegate;
