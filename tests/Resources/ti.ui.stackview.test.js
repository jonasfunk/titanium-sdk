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

describe('Titanium.UI.StackView', () => {
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

	it('apiName', () => {
		const stackView = Ti.UI.createStackView();
		should(stackView).have.readOnlyProperty('apiName').which.is.a.String();
		should(stackView.apiName).be.eql('Ti.UI.StackView');
	});

	it('.axis', () => {
		const stackView = Ti.UI.createStackView();
		should(stackView.axis).be.a.String();
		should(stackView.axis).eql('vertical'); // default value

		stackView.axis = 'horizontal';
		should(stackView.axis).eql('horizontal');

		stackView.axis = 'vertical';
		should(stackView.axis).eql('vertical');
	});

	it('.distribution', () => {
		const stackView = Ti.UI.createStackView();
		should(stackView.distribution).be.a.String();
		should(stackView.distribution).eql('fill'); // default value

		stackView.distribution = 'fillEqually';
		should(stackView.distribution).eql('fillEqually');

		stackView.distribution = 'fillProportionally';
		should(stackView.distribution).eql('fillProportionally');

		stackView.distribution = 'equalSpacing';
		should(stackView.distribution).eql('equalSpacing');

		stackView.distribution = 'equalCentering';
		should(stackView.distribution).eql('equalCentering');
	});

	it('.alignment', () => {
		const stackView = Ti.UI.createStackView();
		should(stackView.alignment).be.a.String();
		should(stackView.alignment).eql('fill'); // default value

		stackView.alignment = 'leading';
		should(stackView.alignment).eql('leading');

		stackView.alignment = 'center';
		should(stackView.alignment).eql('center');

		stackView.alignment = 'trailing';
		should(stackView.alignment).eql('trailing');

		stackView.alignment = 'firstBaseline';
		should(stackView.alignment).eql('firstBaseline');

		stackView.alignment = 'lastBaseline';
		should(stackView.alignment).eql('lastBaseline');
	});

	it('.spacing', () => {
		const stackView = Ti.UI.createStackView();
		should(stackView.spacing).be.a.Number();
		should(stackView.spacing).eql(0); // default value

		stackView.spacing = 10;
		should(stackView.spacing).eql(10);

		stackView.spacing = 20.5;
		should(stackView.spacing).eql(20.5);
	});

	it('.layoutMarginsRelativeArrangement', () => {
		const stackView = Ti.UI.createStackView();
		should(stackView.layoutMarginsRelativeArrangement).be.a.Boolean();
		should(stackView.layoutMarginsRelativeArrangement).be.false(); // default value

		stackView.layoutMarginsRelativeArrangement = true;
		should(stackView.layoutMarginsRelativeArrangement).be.true();
	});

	it('.layoutMargins', () => {
		const stackView = Ti.UI.createStackView();

		const margins = {
			top: 10,
			left: 15,
			bottom: 20,
			right: 25
		};

		stackView.layoutMargins = margins;
		should(stackView.layoutMargins).be.an.Object();
	});

	it('constants', () => {
		// Axis constants
		should(Ti.UI.STACK_VIEW_AXIS_VERTICAL).be.a.String();
		should(Ti.UI.STACK_VIEW_AXIS_VERTICAL).eql('vertical');
		should(Ti.UI.STACK_VIEW_AXIS_HORIZONTAL).be.a.String();
		should(Ti.UI.STACK_VIEW_AXIS_HORIZONTAL).eql('horizontal');

		// Distribution constants
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_FILL).be.a.String();
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_FILL).eql('fill');
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY).be.a.String();
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY).eql('fillEqually');
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_PROPORTIONALLY).be.a.String();
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_PROPORTIONALLY).eql('fillProportionally');
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_SPACING).be.a.String();
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_SPACING).eql('equalSpacing');
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_CENTERING).be.a.String();
		should(Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_CENTERING).eql('equalCentering');

		// Alignment constants
		should(Ti.UI.STACK_VIEW_ALIGNMENT_FILL).be.a.String();
		should(Ti.UI.STACK_VIEW_ALIGNMENT_FILL).eql('fill');
		should(Ti.UI.STACK_VIEW_ALIGNMENT_LEADING).be.a.String();
		should(Ti.UI.STACK_VIEW_ALIGNMENT_LEADING).eql('leading');
		should(Ti.UI.STACK_VIEW_ALIGNMENT_CENTER).be.a.String();
		should(Ti.UI.STACK_VIEW_ALIGNMENT_CENTER).eql('center');
		should(Ti.UI.STACK_VIEW_ALIGNMENT_TRAILING).be.a.String();
		should(Ti.UI.STACK_VIEW_ALIGNMENT_TRAILING).eql('trailing');
		should(Ti.UI.STACK_VIEW_ALIGNMENT_FIRST_BASELINE).be.a.String();
		should(Ti.UI.STACK_VIEW_ALIGNMENT_FIRST_BASELINE).eql('firstBaseline');
		should(Ti.UI.STACK_VIEW_ALIGNMENT_LAST_BASELINE).be.a.String();
		should(Ti.UI.STACK_VIEW_ALIGNMENT_LAST_BASELINE).eql('lastBaseline');
	});

	it('addArrangedSubview()', () => {
		const stackView = Ti.UI.createStackView();
		const view1 = Ti.UI.createView({ backgroundColor: 'red' });
		const view2 = Ti.UI.createView({ backgroundColor: 'blue' });

		should(stackView.addArrangedSubview).be.a.Function();

		// Should not throw
		stackView.addArrangedSubview(view1);
		stackView.addArrangedSubview(view2);
	});

	it('removeArrangedSubview()', () => {
		const stackView = Ti.UI.createStackView();
		const view1 = Ti.UI.createView({ backgroundColor: 'red' });

		should(stackView.removeArrangedSubview).be.a.Function();

		stackView.addArrangedSubview(view1);

		// Should not throw
		stackView.removeArrangedSubview(view1);
	});

	it('insertArrangedSubview()', () => {
		const stackView = Ti.UI.createStackView();
		const view1 = Ti.UI.createView({ backgroundColor: 'red' });
		const view2 = Ti.UI.createView({ backgroundColor: 'blue' });
		const view3 = Ti.UI.createView({ backgroundColor: 'green' });

		should(stackView.insertArrangedSubview).be.a.Function();

		stackView.addArrangedSubview(view1);
		stackView.addArrangedSubview(view3);

		// Insert view2 between view1 and view3
		stackView.insertArrangedSubview(view2, 1);
	});

	it('setCustomSpacing()', () => {
		const stackView = Ti.UI.createStackView();
		const view1 = Ti.UI.createView({ backgroundColor: 'red' });
		const view2 = Ti.UI.createView({ backgroundColor: 'blue' });

		should(stackView.setCustomSpacing).be.a.Function();

		stackView.addArrangedSubview(view1);
		stackView.addArrangedSubview(view2);

		// Should not throw
		stackView.setCustomSpacing(20, view1);
	});

	it('vertical layout', function (finish) {
		this.timeout(5000);

		win = Ti.UI.createWindow({ backgroundColor: 'white' });

		const stackView = Ti.UI.createStackView({
			axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
			distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
			alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
			spacing: 10,
			backgroundColor: 'lightgray',
			width: 200,
			height: 300
		});

		const view1 = Ti.UI.createView({
			backgroundColor: 'red',
			height: 50
		});

		const view2 = Ti.UI.createView({
			backgroundColor: 'blue',
			height: 50
		});

		const view3 = Ti.UI.createView({
			backgroundColor: 'green',
			height: 50
		});

		stackView.addArrangedSubview(view1);
		stackView.addArrangedSubview(view2);
		stackView.addArrangedSubview(view3);

		win.add(stackView);

		win.addEventListener('open', () => {
			setTimeout(() => {
				try {
					should(stackView.axis).eql('vertical');
					should(stackView.distribution).eql('fillEqually');
					should(stackView.alignment).eql('fill');
					should(stackView.spacing).eql(10);
					finish();
				} catch (err) {
					finish(err);
				}
			}, 1000);
		});

		win.open();
	});

	it('horizontal layout', function (finish) {
		this.timeout(5000);

		win = Ti.UI.createWindow({ backgroundColor: 'white' });

		const stackView = Ti.UI.createStackView({
			axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
			distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_EQUAL_SPACING,
			alignment: Ti.UI.STACK_VIEW_ALIGNMENT_CENTER,
			spacing: 15,
			backgroundColor: 'lightgray',
			width: 300,
			height: 100
		});

		const view1 = Ti.UI.createView({
			backgroundColor: 'red',
			width: 50,
			height: 50
		});

		const view2 = Ti.UI.createView({
			backgroundColor: 'blue',
			width: 60,
			height: 60
		});

		const view3 = Ti.UI.createView({
			backgroundColor: 'green',
			width: 40,
			height: 40
		});

		stackView.addArrangedSubview(view1);
		stackView.addArrangedSubview(view2);
		stackView.addArrangedSubview(view3);

		win.add(stackView);

		win.addEventListener('open', () => {
			setTimeout(() => {
				try {
					should(stackView.axis).eql('horizontal');
					should(stackView.distribution).eql('equalSpacing');
					should(stackView.alignment).eql('center');
					should(stackView.spacing).eql(15);
					finish();
				} catch (err) {
					finish(err);
				}
			}, 1000);
		});

		win.open();
	});

	it('dynamic updates', function (finish) {
		this.timeout(5000);

		win = Ti.UI.createWindow({ backgroundColor: 'white' });

		const stackView = Ti.UI.createStackView({
			axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
			distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL,
			alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
			spacing: 5,
			backgroundColor: 'lightgray',
			width: 200,
			height: 300
		});

		const view1 = Ti.UI.createView({
			backgroundColor: 'red',
			height: 50
		});

		stackView.addArrangedSubview(view1);
		win.add(stackView);

		win.addEventListener('open', () => {
			setTimeout(() => {
				try {
					// Test dynamic property changes
					stackView.axis = Ti.UI.STACK_VIEW_AXIS_HORIZONTAL;
					should(stackView.axis).eql('horizontal');

					stackView.spacing = 20;
					should(stackView.spacing).eql(20);

					stackView.distribution = Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY;
					should(stackView.distribution).eql('fillEqually');

					// Test adding more views dynamically
					const view2 = Ti.UI.createView({
						backgroundColor: 'blue',
						width: 50
					});

					stackView.addArrangedSubview(view2);

					finish();
				} catch (err) {
					finish(err);
				}
			}, 1000);
		});

		win.open();
	});

	it('animationsEnabled property', () => {
		const stackView = Ti.UI.createStackView({
			animationsEnabled: false
		});
		should(stackView.animationsEnabled).be.false();

		stackView.animationsEnabled = true;
		should(stackView.animationsEnabled).be.true();
	});

	it('animationDuration property', () => {
		const stackView = Ti.UI.createStackView({
			animationDuration: 500
		});
		should(stackView.animationDuration).eql(500);

		stackView.animationDuration = 1000;
		should(stackView.animationDuration).eql(1000);
	});

	it('should animate view additions and removals', function (finish) {
		this.timeout(3000);

		win = Ti.UI.createWindow();
		const stackView = Ti.UI.createStackView({
			axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
			animationsEnabled: true,
			animationDuration: 200
		});

		const view1 = Ti.UI.createView({
			backgroundColor: 'red',
			height: 50
		});

		win.add(stackView);
		win.addEventListener('open', () => {
			// Add view with animation
			stackView.addArrangedSubview(view1);

			setTimeout(() => {
				// Remove view with animation
				stackView.removeArrangedSubview(view1);

				setTimeout(() => {
					// Animation should complete without crashes
					finish();
				}, 300);
			}, 300);
		});

		win.open();
	});
});
