/* eslint-env mocha */

describe('Ti.UI.View.measure', () => {
	it('returns width/height for unattached label with SIZE and long text', async () => {
		const label = Ti.UI.createLabel({
			width: Ti.UI.SIZE,
			height: Ti.UI.SIZE,
			text: 'This is a long text that should wrap into multiple lines when constrained.'
		});

		const result = await label.measure({ maxWidth: 200 });
		if (!result) {
			throw new Error('measure returned null/undefined');
		}
		if (typeof result.width !== 'number' || typeof result.height !== 'number') {
			throw new Error('measure did not return numeric width/height');
		}
		if (!(result.width <= 200)) {
			throw new Error('width should be <= maxWidth constraint');
		}
		if (!(result.height > 0)) {
			throw new Error('height should be > 0');
		}
	});

	it('respects exact width/height', async () => {
		const view = Ti.UI.createView({ backgroundColor: 'red' });
		const result = await view.measure({ width: 123, height: 45 });
		if (result.width !== 123 || result.height !== 45) {
			throw new Error(`unexpected size ${JSON.stringify(result)}`);
		}
	});
});
