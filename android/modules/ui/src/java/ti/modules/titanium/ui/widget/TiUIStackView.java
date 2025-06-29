/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.ui.widget;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.appcelerator.kroll.KrollDict;
import org.appcelerator.kroll.common.Log;
import org.appcelerator.titanium.TiC;
import org.appcelerator.titanium.proxy.TiViewProxy;
import org.appcelerator.titanium.util.TiConvert;
import org.appcelerator.titanium.view.TiUIView;

import ti.modules.titanium.ui.UIModule;

import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.view.animation.LayoutTransition;

/**
 * StackView implementation for Android using LinearLayout.
 * Provides similar functionality to iOS UIStackView.
 */
public class TiUIStackView extends TiUIView
{
	private static final String TAG = "TiUIStackView";

	private LinearLayout stackLayout;
	private String axis = UIModule.STACK_VIEW_AXIS_VERTICAL;
	private String distribution = UIModule.STACK_VIEW_DISTRIBUTION_FILL;
	private String alignment = UIModule.STACK_VIEW_ALIGNMENT_FILL;
	private int spacing = 0;
	private boolean layoutMarginsRelativeArrangement = false;

	// Keep track of arranged subviews and their custom spacing
	private List<TiViewProxy> arrangedSubviews = new ArrayList<>();
	private Map<TiViewProxy, Float> customSpacing = new HashMap<>();

	public TiUIStackView(TiViewProxy proxy)
	{
		super(proxy);

		stackLayout = new LinearLayout(proxy.getActivity());
		stackLayout.setOrientation(LinearLayout.VERTICAL);

		// ✅ Enable automatic layout animations (API 11+)
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
			LayoutTransition layoutTransition = new LayoutTransition();
			layoutTransition.enableTransitionType(LayoutTransition.CHANGING);
			layoutTransition.enableTransitionType(LayoutTransition.APPEARING);
			layoutTransition.enableTransitionType(LayoutTransition.DISAPPEARING);
			layoutTransition.enableTransitionType(LayoutTransition.CHANGE_APPEARING);
			layoutTransition.enableTransitionType(LayoutTransition.CHANGE_DISAPPEARING);

			// Customize animation durations for smoother feel
			layoutTransition.setDuration(LayoutTransition.APPEARING, 300);
			layoutTransition.setDuration(LayoutTransition.DISAPPEARING, 300);
			layoutTransition.setDuration(LayoutTransition.CHANGING, 300);
			layoutTransition.setDuration(LayoutTransition.CHANGE_APPEARING, 300);
			layoutTransition.setDuration(LayoutTransition.CHANGE_DISAPPEARING, 300);

			stackLayout.setLayoutTransition(layoutTransition);
			Log.d(TAG, "Layout animations enabled");
		}

		// Set default layout parameters
		getLayoutParams().autoFillsWidth = true;
		getLayoutParams().autoFillsHeight = false;

		setNativeView(stackLayout);
	}

	@Override
	public void processProperties(KrollDict properties)
	{
		super.processProperties(properties);

		if (properties.containsKey(TiC.PROPERTY_AXIS)) {
			setAxis(TiConvert.toString(properties.get(TiC.PROPERTY_AXIS)));
		}
		if (properties.containsKey(TiC.PROPERTY_DISTRIBUTION)) {
			setDistribution(TiConvert.toString(properties.get(TiC.PROPERTY_DISTRIBUTION)));
		}
		if (properties.containsKey(TiC.PROPERTY_ALIGNMENT)) {
			setAlignment(TiConvert.toString(properties.get(TiC.PROPERTY_ALIGNMENT)));
		}
		if (properties.containsKey(TiC.PROPERTY_SPACING)) {
			setSpacing(TiConvert.toInt(properties.get(TiC.PROPERTY_SPACING)));
		}
		if (properties.containsKey(TiC.PROPERTY_LAYOUT_MARGINS_RELATIVE_ARRANGEMENT)) {
			setLayoutMarginsRelativeArrangement(
				TiConvert.toBoolean(properties.get(TiC.PROPERTY_LAYOUT_MARGINS_RELATIVE_ARRANGEMENT)));
		}
		if (properties.containsKey(TiC.PROPERTY_LAYOUT_MARGINS)) {
			setLayoutMargins(properties.getKrollDict(TiC.PROPERTY_LAYOUT_MARGINS));
		}
	}

	/**
	 * Adds a view to the end of the arrangedSubviews array.
	 */
	public void addArrangedSubview(TiViewProxy viewProxy)
	{
		if (viewProxy == null || arrangedSubviews.contains(viewProxy)) {
			return;
		}

		arrangedSubviews.add(viewProxy);
		TiUIView tiView = viewProxy.getOrCreateView();
		View androidView = tiView.getOuterView();

		LinearLayout.LayoutParams layoutParams = createLayoutParams(viewProxy);
		stackLayout.addView(androidView, layoutParams);

		updateSpacing();
		Log.d(TAG, "Added arranged subview: " + viewProxy.getApiName());
	}

	/**
	 * Removes the provided view from the stack's array of arranged subviews.
	 */
	public void removeArrangedSubview(TiViewProxy viewProxy)
	{
		if (viewProxy == null || !arrangedSubviews.contains(viewProxy)) {
			return;
		}

		arrangedSubviews.remove(viewProxy);
		customSpacing.remove(viewProxy);

		TiUIView tiView = viewProxy.getView();
		if (tiView != null) {
			View androidView = tiView.getOuterView();
			stackLayout.removeView(androidView);
		}

		updateSpacing();
		Log.d(TAG, "Removed arranged subview: " + viewProxy.getApiName());
	}

	/**
	 * Inserts the provided view into the arrangedSubviews array at the specified index.
	 */
	public void insertArrangedSubview(TiViewProxy viewProxy, int index)
	{
		if (viewProxy == null || arrangedSubviews.contains(viewProxy)) {
			return;
		}

		// Clamp index to valid range
		index = Math.max(0, Math.min(index, arrangedSubviews.size()));

		arrangedSubviews.add(index, viewProxy);
		TiUIView tiView = viewProxy.getOrCreateView();
		View androidView = tiView.getOuterView();

		LinearLayout.LayoutParams layoutParams = createLayoutParams(viewProxy);
		stackLayout.addView(androidView, index, layoutParams);

		updateSpacing();
		Log.d(TAG, "Inserted arranged subview at index " + index + ": " + viewProxy.getApiName());
	}

	/**
	 * Applies custom spacing after the specified view.
	 */
	public void setCustomSpacing(float spacing, TiViewProxy afterViewProxy)
	{
		if (afterViewProxy == null || !arrangedSubviews.contains(afterViewProxy)) {
			return;
		}

		customSpacing.put(afterViewProxy, spacing);
		updateSpacing();
		Log.d(TAG, "Set custom spacing " + spacing + " after view: " + afterViewProxy.getApiName());
	}

	/**
	 * Creates layout parameters for a view based on current distribution and alignment settings.
	 */
	private LinearLayout.LayoutParams createLayoutParams(TiViewProxy viewProxy)
	{
		LinearLayout.LayoutParams params;

		switch (distribution) {
			case UIModule.STACK_VIEW_DISTRIBUTION_FILL_EQUALLY:
				if (axis.equals(UIModule.STACK_VIEW_AXIS_VERTICAL)) {
					params = new LinearLayout.LayoutParams(
						LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);
				} else {
					params = new LinearLayout.LayoutParams(
						0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
				}
				break;

			case UIModule.STACK_VIEW_DISTRIBUTION_FILL_PROPORTIONALLY:
				// For proportional fill, we would need to calculate weights based on intrinsic content size
				// For now, treat as regular fill
			case UIModule.STACK_VIEW_DISTRIBUTION_FILL:
			default:
				if (axis.equals(UIModule.STACK_VIEW_AXIS_VERTICAL)) {
					params = new LinearLayout.LayoutParams(
						LinearLayout.LayoutParams.MATCH_PARENT,
						LinearLayout.LayoutParams.WRAP_CONTENT);
				} else {
					params = new LinearLayout.LayoutParams(
						LinearLayout.LayoutParams.WRAP_CONTENT,
						LinearLayout.LayoutParams.MATCH_PARENT);
				}
				break;

			case UIModule.STACK_VIEW_DISTRIBUTION_EQUAL_SPACING:
			case UIModule.STACK_VIEW_DISTRIBUTION_EQUAL_CENTERING:
				// These require more complex layout calculations
				// For now, treat as wrap content with center gravity
				params = new LinearLayout.LayoutParams(
					LinearLayout.LayoutParams.WRAP_CONTENT,
					LinearLayout.LayoutParams.WRAP_CONTENT);
				break;
		}

		// Apply alignment
		switch (alignment) {
			case UIModule.STACK_VIEW_ALIGNMENT_CENTER:
				params.gravity = Gravity.CENTER;
				break;
			case UIModule.STACK_VIEW_ALIGNMENT_LEADING:
				params.gravity = axis.equals(UIModule.STACK_VIEW_AXIS_VERTICAL)
					? Gravity.START : Gravity.TOP;
				break;
			case UIModule.STACK_VIEW_ALIGNMENT_TRAILING:
				params.gravity = axis.equals(UIModule.STACK_VIEW_AXIS_VERTICAL)
					? Gravity.END : Gravity.BOTTOM;
				break;
			case UIModule.STACK_VIEW_ALIGNMENT_FIRST_BASELINE:
			case UIModule.STACK_VIEW_ALIGNMENT_LAST_BASELINE:
				// Baseline alignment is more complex on Android
				// For now, treat as center
				params.gravity = Gravity.CENTER;
				break;
			case UIModule.STACK_VIEW_ALIGNMENT_FILL:
			default:
				params.gravity = Gravity.FILL;
				break;
		}

		return params;
	}

	/**
	 * Updates spacing between views based on global spacing and custom spacing settings.
	 */
	private void updateSpacing()
	{
		for (int i = 0; i < stackLayout.getChildCount(); i++) {
			View child = stackLayout.getChildAt(i);
			LinearLayout.LayoutParams params = (LinearLayout.LayoutParams) child.getLayoutParams();

			// Reset margins
			params.topMargin = 0;
			params.bottomMargin = 0;
			params.leftMargin = 0;
			params.rightMargin = 0;

			// Apply spacing if not the last child
			if (i < stackLayout.getChildCount() - 1) {
				TiViewProxy currentProxy = arrangedSubviews.get(i);
				float currentSpacing = spacing;

				// Check for custom spacing
				if (customSpacing.containsKey(currentProxy)) {
					currentSpacing = customSpacing.get(currentProxy);
				}

				// Apply spacing based on axis
				if (axis.equals(UIModule.STACK_VIEW_AXIS_VERTICAL)) {
					params.bottomMargin = (int) currentSpacing;
				} else {
					params.rightMargin = (int) currentSpacing;
				}
			}

			child.setLayoutParams(params);
		}
	}

	/**
	 * Updates all layout parameters when distribution or alignment changes.
	 */
	private void updateAllLayoutParams()
	{
		for (int i = 0; i < arrangedSubviews.size(); i++) {
			TiViewProxy proxy = arrangedSubviews.get(i);
			TiUIView tiView = proxy.getView();
			if (tiView != null) {
				View androidView = tiView.getOuterView();
				LinearLayout.LayoutParams params = createLayoutParams(proxy);
				androidView.setLayoutParams(params);
			}
		}
		updateSpacing();
	}

	// Property setters

	public void setAxis(String axis)
	{
		this.axis = axis;
		stackLayout.setOrientation(
			axis.equals(UIModule.STACK_VIEW_AXIS_HORIZONTAL)
				? LinearLayout.HORIZONTAL
				: LinearLayout.VERTICAL
		);
		updateAllLayoutParams();
		Log.d(TAG, "Set axis to: " + axis);
	}

	public void setDistribution(String distribution)
	{
		this.distribution = distribution;
		updateAllLayoutParams();
		Log.d(TAG, "Set distribution to: " + distribution);
	}

	public void setAlignment(String alignment)
	{
		this.alignment = alignment;
		updateAllLayoutParams();
		Log.d(TAG, "Set alignment to: " + alignment);
	}

	public void setSpacing(int spacing)
	{
		this.spacing = spacing;
		updateSpacing();
		Log.d(TAG, "Set spacing to: " + spacing);
	}

	public void setLayoutMarginsRelativeArrangement(boolean enabled)
	{
		this.layoutMarginsRelativeArrangement = enabled;
		// Implementation depends on how margins are applied
		Log.d(TAG, "Set layoutMarginsRelativeArrangement to: " + enabled);
	}

	public void setLayoutMargins(KrollDict margins)
	{
		if (margins == null) {
			return;
		}

		int top = TiConvert.toInt(margins.get("top"), 0);
		int left = TiConvert.toInt(margins.get("left"), 0);
		int bottom = TiConvert.toInt(margins.get("bottom"), 0);
		int right = TiConvert.toInt(margins.get("right"), 0);

		stackLayout.setPadding(left, top, right, bottom);
		Log.d(TAG, "Set layout margins: " + left + "," + top + "," + right + "," + bottom);
	}

	// ✅ Method to enable/disable animations
	public void setAnimationsEnabled(boolean enabled)
	{
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
			if (enabled) {
				if (stackLayout.getLayoutTransition() == null) {
					LayoutTransition layoutTransition = new LayoutTransition();
					layoutTransition.enableTransitionType(LayoutTransition.CHANGING);
					layoutTransition.enableTransitionType(LayoutTransition.APPEARING);
					layoutTransition.enableTransitionType(LayoutTransition.DISAPPEARING);
					layoutTransition.enableTransitionType(LayoutTransition.CHANGE_APPEARING);
					layoutTransition.enableTransitionType(LayoutTransition.CHANGE_DISAPPEARING);

					// Smooth animation durations
					layoutTransition.setDuration(LayoutTransition.APPEARING, 300);
					layoutTransition.setDuration(LayoutTransition.DISAPPEARING, 300);
					layoutTransition.setDuration(LayoutTransition.CHANGING, 300);
					layoutTransition.setDuration(LayoutTransition.CHANGE_APPEARING, 300);
					layoutTransition.setDuration(LayoutTransition.CHANGE_DISAPPEARING, 300);

					stackLayout.setLayoutTransition(layoutTransition);
					Log.d(TAG, "Layout animations enabled");
				}
			} else {
				stackLayout.setLayoutTransition(null);
				Log.d(TAG, "Layout animations disabled");
			}
		}
	}

	// ✅ Method to set animation duration
	public void setAnimationDuration(int durationMs)
	{
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB) {
			LayoutTransition transition = stackLayout.getLayoutTransition();
			if (transition != null) {
				transition.setDuration(LayoutTransition.APPEARING, durationMs);
				transition.setDuration(LayoutTransition.DISAPPEARING, durationMs);
				transition.setDuration(LayoutTransition.CHANGING, durationMs);
				transition.setDuration(LayoutTransition.CHANGE_APPEARING, durationMs);
				transition.setDuration(LayoutTransition.CHANGE_DISAPPEARING, durationMs);
				Log.d(TAG, "Animation duration set to " + durationMs + "ms");
			}
		}
	}

	@Override
	public void release()
	{
		arrangedSubviews.clear();
		customSpacing.clear();
		super.release();
	}
}