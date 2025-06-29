/**
 * StackView Example Application
 * Demonstrates the usage of Ti.UI.StackView on both Android and iOS
 */

/* global Ti */

// Create main window
const win = Ti.UI.createWindow({
	title: 'StackView Examples',
	backgroundColor: '#f5f5f5'
});

// Create scroll view to hold all examples
const scrollView = Ti.UI.createScrollView({
	layout: 'vertical',
	width: Ti.UI.FILL,
	height: Ti.UI.FILL,
	top: 0
});

// Example 1: Basic Vertical Stack
const example1 = createExample('Basic Vertical Stack', () => {
	const stackView = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 8,
		width: '90%',
		height: 200
	});

	const redView = Ti.UI.createView({
		backgroundColor: '#ff4444',
		height: 40
	});

	const greenView = Ti.UI.createView({
		backgroundColor: '#44ff44',
		height: 40
	});

	const blueView = Ti.UI.createView({
		backgroundColor: '#4444ff',
		height: 40
	});

	stackView.addArrangedSubview(redView);
	stackView.addArrangedSubview(greenView);
	stackView.addArrangedSubview(blueView);

	return stackView;
});

// Example 2: Horizontal Stack with Equal Distribution
const example2 = createExample('Horizontal Stack with Equal Distribution', () => {
	const stackView = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 4,
		backgroundColor: '#e0e0e0',
		borderRadius: 8,
		width: '90%',
		height: 80
	});

	const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44'];

	colors.forEach((color) => {
		const view = Ti.UI.createView({
			backgroundColor: color,
			height: 60,
			borderRadius: 4
		});
		stackView.addArrangedSubview(view);
	});

	return stackView;
});

// Example 3: Dynamic Stack Management
const example3 = createExample('Dynamic Stack Management', () => {
	const container = Ti.UI.createView({
		layout: 'vertical',
		height: 250,
		width: '90%'
	});

	const stackView = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 6,
		backgroundColor: '#e0e0e0',
		borderRadius: 8,
		height: 180
	});

	const buttonContainer = Ti.UI.createView({
		layout: 'horizontal',
		height: 50,
		top: 10
	});

	const addButton = Ti.UI.createButton({
		title: 'Add View',
		width: 80,
		height: 35,
		backgroundColor: '#4CAF50',
		color: 'white',
		borderRadius: 4
	});

	const removeButton = Ti.UI.createButton({
		title: 'Remove View',
		width: 100,
		height: 35,
		backgroundColor: '#f44336',
		color: 'white',
		borderRadius: 4,
		left: 10
	});

	const toggleButton = Ti.UI.createButton({
		title: 'Toggle Axis',
		width: 90,
		height: 35,
		backgroundColor: '#2196F3',
		color: 'white',
		borderRadius: 4,
		left: 10
	});

	let viewCount = 0;
	const colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];

	addButton.addEventListener('click', () => {
		if (viewCount < 6) {
			const newView = Ti.UI.createView({
				backgroundColor: colors[viewCount],
				height: stackView.axis === 'vertical' ? 25 : 60,
				width: stackView.axis === 'horizontal' ? 40 : Ti.UI.FILL
			});
			stackView.addArrangedSubview(newView);
			viewCount++;
		}
	});

	removeButton.addEventListener('click', () => {
		if (viewCount > 0) {
			// For demo purposes, we'll remove the last added view
			// In a real app, you'd keep references to the views
			viewCount--;
		}
	});

	toggleButton.addEventListener('click', () => {
		stackView.axis = stackView.axis === 'vertical' ? 'horizontal' : 'vertical';
		stackView.distribution = stackView.axis === 'vertical'
			? Ti.UI.STACK_VIEW_DISTRIBUTION_FILL
			: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY;
	});

	buttonContainer.add(addButton);
	buttonContainer.add(removeButton);
	buttonContainer.add(toggleButton);

	container.add(stackView);
	container.add(buttonContainer);

	return container;
});

// Example 4: Nested StackViews
const example4 = createExample('Nested StackViews', () => {
	const outerStack = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 8,
		width: '90%',
		height: 200
	});

	// Top horizontal stack
	const topStack = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 4,
		backgroundColor: '#d0d0d0',
		borderRadius: 4
	});

	const redView = Ti.UI.createView({ backgroundColor: '#ff4444' });
	const blueView = Ti.UI.createView({ backgroundColor: '#4444ff' });
	topStack.addArrangedSubview(redView);
	topStack.addArrangedSubview(blueView);

	// Bottom horizontal stack
	const bottomStack = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_HORIZONTAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 4,
		backgroundColor: '#d0d0d0',
		borderRadius: 4
	});

	const greenView = Ti.UI.createView({ backgroundColor: '#44ff44' });
	const yellowView = Ti.UI.createView({ backgroundColor: '#ffff44' });
	const purpleView = Ti.UI.createView({ backgroundColor: '#ff44ff' });
	bottomStack.addArrangedSubview(greenView);
	bottomStack.addArrangedSubview(yellowView);
	bottomStack.addArrangedSubview(purpleView);

	outerStack.addArrangedSubview(topStack);
	outerStack.addArrangedSubview(bottomStack);

	return outerStack;
});

// Example 5: StackView with Layout Margins
const example5 = createExample('StackView with Layout Margins', () => {
	const stackView = Ti.UI.createStackView({
		axis: Ti.UI.STACK_VIEW_AXIS_VERTICAL,
		distribution: Ti.UI.STACK_VIEW_DISTRIBUTION_FILL,
		alignment: Ti.UI.STACK_VIEW_ALIGNMENT_FILL,
		spacing: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 8,
		width: '90%',
		height: 180,
		layoutMargins: {
			top: 16,
			left: 16,
			bottom: 16,
			right: 16
		},
		layoutMarginsRelativeArrangement: true
	});

	const view1 = Ti.UI.createView({
		backgroundColor: '#ff4444',
		height: 40
	});

	const view2 = Ti.UI.createView({
		backgroundColor: '#44ff44',
		height: 40
	});

	const view3 = Ti.UI.createView({
		backgroundColor: '#4444ff',
		height: 40
	});

	stackView.addArrangedSubview(view1);
	stackView.addArrangedSubview(view2);
	stackView.addArrangedSubview(view3);

	return stackView;
});

// Helper function to create example sections
function createExample (title, createStackView) {
	const container = Ti.UI.createView({
		layout: 'vertical',
		height: Ti.UI.SIZE,
		width: Ti.UI.FILL,
		top: 20
	});

	const titleLabel = Ti.UI.createLabel({
		text: title,
		font: { fontSize: 18, fontWeight: 'bold' },
		color: '#333',
		textAlign: 'center',
		height: Ti.UI.SIZE,
		top: 0
	});

	const stackView = createStackView();

	container.add(titleLabel);
	container.add(stackView);

	return container;
}

// Add all examples to scroll view
scrollView.add(example1);
scrollView.add(example2);
scrollView.add(example3);
scrollView.add(example4);
scrollView.add(example5);

// Add scroll view to window
win.add(scrollView);

// Open the window
win.open();

// Log StackView constants for debugging
Ti.API.info('StackView Constants:');
Ti.API.info('AXIS_VERTICAL: ' + Ti.UI.STACK_VIEW_AXIS_VERTICAL);
Ti.API.info('AXIS_HORIZONTAL: ' + Ti.UI.STACK_VIEW_AXIS_HORIZONTAL);
Ti.API.info('DISTRIBUTION_FILL: ' + Ti.UI.STACK_VIEW_DISTRIBUTION_FILL);
Ti.API.info('DISTRIBUTION_FILL_EQUALLY: ' + Ti.UI.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY);
Ti.API.info('ALIGNMENT_FILL: ' + Ti.UI.STACK_VIEW_ALIGNMENT_FILL);
Ti.API.info('ALIGNMENT_CENTER: ' + Ti.UI.STACK_VIEW_ALIGNMENT_CENTER);
