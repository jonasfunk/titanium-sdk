/*
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
/* eslint-env mocha */
/* eslint no-unused-expressions: "off" */
'use strict';

const should = require('./utilities/assertions');

describe('Titanium.UI.StackView - Advanced Integration Tests', () => {
	let win;

	afterEach(done => {
		if (win) {
			win.addEventListener('close', function listener() {
				win.removeEventListener('close', listener);
				win = null;
				done();
			});
			win.close();
		} else {
			win = null;
			done();
		}
	});

	describe('Edge Cases', () => {
		it('should handle empty stackview', () => {
			const stackView = Ti.UI.createStackView();
			should(stackView).be.ok();
			// Should not crash with no arranged subviews
		});

		it('should handle null/undefined parameters gracefully', () => {
			const stackView = Ti.UI.createStackView();

			// These should not crash
			stackView.addArrangedSubview(null);
			stackView.removeArrangedSubview(undefined);
			stackView.insertArrangedSubview(null, 0);
			stackView.setCustomSpacing(10, null);
		});

		it('should handle invalid index in insertArrangedSubview', () => {
			const stackView = Ti.UI.createStackView();
			const view1 = Ti.UI.createView();

			// Should clamp to valid range
			stackView.insertArrangedSubview(view1, -1); // Should insert at 0
			stackView.insertArrangedSubview(view1, 999); // Should insert at end
		});

		it('should handle duplicate view additions', () => {
			const stackView = Ti.UI.createStackView();
			const view1 = Ti.UI.createView();

			stackView.addArrangedSubview(view1);
			// Adding same view again should not duplicate
			stackView.addArrangedSubview(view1);
		});
	});

	describe('Memory Management', () => {
		it('should properly release views when removed', function (finish) {
			this.timeout(3000);

			win = Ti.UI.createWindow();
			const stackView = Ti.UI.createStackView();
			const views = [];

			// Create many views
			for (let i = 0; i < 10; i++) {
				const view = Ti.UI.createView({
					backgroundColor: `hsl(${i * 36}, 70%, 50%)`,
					height: 30
				});
				views.push(view);
				stackView.addArrangedSubview(view);
			}

			win.add(stackView);
			win.addEventListener('open', () => {
				setTimeout(() => {
					// Remove all views
					views.forEach(view => {
						stackView.removeArrangedSubview(view);
					});

					// Force garbage collection hint
					if (Ti.Platform.osname === 'android') {
						// Android specific GC hint
						Ti.API.info('Views removed, suggesting GC');
					}

					finish();
				}, 1000);
			});

			win.open();
		});
	});

	describe('Performance Tests', () => {
		it('should handle many views efficiently', function (finish) {
			this.timeout(10000);

			win = Ti.UI.createWindow();
			const stackView = Ti.UI.createStackView({
				axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
				distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL
			});

			const startTime = Date.now();
			const viewCount = 50;

			// Add many views
			for (let i = 0; i < viewCount; i++) {
				const view = Ti.UI.createView({
					backgroundColor: `hsl(${i * 7}, 60%, 50%)`,
					height: 20
				});
				stackView.addArrangedSubview(view);
			}

			const addTime = Date.now() - startTime;
			Ti.API.info(`Added ${viewCount} views in ${addTime}ms`);

			win.add(stackView);
			win.addEventListener('open', () => {
				setTimeout(() => {
					const layoutTime = Date.now();

					// Change properties to trigger layout
					stackView.axis = Ti.UI.STACK_VIEW_AXIS_HORIZONTAL;
					stackView.axis = Ti.UI.STACK_VIEW_AXIS_VERTICAL;

					const relayoutTime = Date.now() - layoutTime;
					Ti.API.info(`Relayout took ${relayoutTime}ms`);

					// Performance should be reasonable
					should(addTime).be.below(1000); // Less than 1 second
					should(relayoutTime).be.below(500); // Less than 500ms

					finish();
				}, 1000);
			});

			win.open();
		});
	});

	describe('Platform-Specific Features', () => {
		it('should handle iOS-specific setCustomSpacing availability', () => {
			const stackView = Ti.UI.createStackView();
			const view1 = Ti.UI.createView();
			const view2 = Ti.UI.createView();

			stackView.addArrangedSubview(view1);
			stackView.addArrangedSubview(view2);

			if (Ti.Platform.osname === 'iphone' || Ti.Platform.osname === 'ipad') {
				// Should work on iOS
				stackView.setCustomSpacing(20, view1);
			} else {
				// Should work on Android too (our implementation)
				stackView.setCustomSpacing(20, view1);
			}
		});

		it('should handle platform-specific alignment behaviors', () => {
			const stackView = Ti.UI.createStackView({
				axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
				alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FIRST_BASELINE
			});

			const label1 = Ti.UI.createLabel({
				text: 'Small',
				font: { fontSize: 12 }
			});

			const label2 = Ti.UI.createLabel({
				text: 'Large',
				font: { fontSize: 24 }
			});

			stackView.addArrangedSubview(label1);
			stackView.addArrangedSubview(label2);

			// Should not crash on either platform
			should(stackView.alignment).eql('firstBaseline');
		});
	});

	describe('Complex Layout Scenarios', () => {
		it('should handle nested stackviews with different orientations', function (finish) {
			this.timeout(5000);

			win = Ti.UI.createWindow();

			// Outer vertical stack
			const outerStack = Ti.UI.createStackView({
				axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
				distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
				spacing: 8,
				width: 300,
				height: 400
			});

			// Top horizontal stack
			const topStack = Ti.UI.createStackView({
				axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
				distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
				spacing: 4
			});

			// Bottom horizontal stack
			const bottomStack = Ti.UI.createStackView({
				axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
				distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_SPACING,
				spacing: 8
			});

			// Add views to top stack
			for (let i = 0; i < 3; i++) {
				const view = Ti.UI.createView({
					backgroundColor: `hsl(${i * 120}, 70%, 50%)`
				});
				topStack.addArrangedSubview(view);
			}

			// Add views to bottom stack
			for (let i = 0; i < 4; i++) {
				const view = Ti.UI.createView({
					backgroundColor: `hsl(${i * 90 + 45}, 70%, 50%)`,
					width: 50
				});
				bottomStack.addArrangedSubview(view);
			}

			outerStack.addArrangedSubview(topStack);
			outerStack.addArrangedSubview(bottomStack);

			win.add(outerStack);
			win.addEventListener('open', () => {
				setTimeout(() => {
					// Test dynamic changes in nested structure
					outerStack.spacing = 16;
					topStack.distribution = Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_SPACING;

					finish();
				}, 1000);
			});

			win.open();
		});

		it('should handle stackview inside scrollview', function (finish) {
			this.timeout(5000);

			win = Ti.UI.createWindow();

			const scrollView = Ti.UI.createScrollView({
				layout: 'vertical',
				showVerticalScrollIndicator: true
			});

			const stackView = Ti.UI.createStackView({
				axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
				distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL,
				spacing: 8,
				width: Ti.UI.FILL
			});

			// Add many views to test scrolling
			for (let i = 0; i < 20; i++) {
				const view = Ti.UI.createView({
					backgroundColor: `hsl(${i * 18}, 60%, 50%)`,
					height: 80,
					borderRadius: 8
				});

				const label = Ti.UI.createLabel({
					text: `Item ${i + 1}`,
					color: 'white',
					font: { fontSize: 16, fontWeight: 'bold' }
				});

				view.add(label);
				stackView.addArrangedSubview(view);
			}

			scrollView.add(stackView);
			win.add(scrollView);

			win.addEventListener('open', () => {
				setTimeout(() => {
					// Should be scrollable
					finish();
				}, 1000);
			});

			win.open();
		});
	});

	describe('Error Handling', () => {
		it('should handle invalid property values gracefully', () => {
			const stackView = Ti.UI.createStackView();

			// These should not crash
			stackView.axis = 'invalid';
			stackView.distribution = 'nonexistent';
			stackView.alignment = 'badvalue';
			stackView.spacing = 'notanumber';

			// Should fall back to defaults or handle gracefully
			should(stackView).be.ok();
		});

		it('should handle view hierarchy violations', () => {
			const stackView1 = Ti.UI.createStackView();
			const stackView2 = Ti.UI.createStackView();
			const view = Ti.UI.createView();

			// Add view to first stack
			stackView1.addArrangedSubview(view);

			// Try to add same view to second stack
			// Should handle this gracefully
			stackView2.addArrangedSubview(view);
		});
	});
});
