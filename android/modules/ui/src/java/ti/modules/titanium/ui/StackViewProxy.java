/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.ui;

import android.app.Activity;

import org.appcelerator.kroll.annotations.Kroll;
import org.appcelerator.titanium.TiC;
import org.appcelerator.titanium.proxy.TiViewProxy;
import org.appcelerator.titanium.view.TiUIView;

import ti.modules.titanium.ui.widget.TiUIStackView;

@Kroll.proxy(creatableInModule = UIModule.class, propertyAccessors = {
	TiC.PROPERTY_AXIS,
	TiC.PROPERTY_DISTRIBUTION,
	TiC.PROPERTY_ALIGNMENT,
	TiC.PROPERTY_SPACING,
	TiC.PROPERTY_LAYOUT_MARGINS,
	TiC.PROPERTY_LAYOUT_MARGINS_RELATIVE_ARRANGEMENT
})
public class StackViewProxy extends TiViewProxy
{
	private static final String TAG = "StackViewProxy";

	public StackViewProxy()
	{
		super();
		defaultValues.put(TiC.PROPERTY_AXIS, UIModule.STACK_VIEW_AXIS_VERTICAL);
		defaultValues.put(TiC.PROPERTY_DISTRIBUTION, UIModule.STACK_VIEW_DISTRIBUTION_FILL);
		defaultValues.put(TiC.PROPERTY_ALIGNMENT, UIModule.STACK_VIEW_ALIGNMENT_FILL);
		defaultValues.put(TiC.PROPERTY_SPACING, 0);
		defaultValues.put(TiC.PROPERTY_LAYOUT_MARGINS_RELATIVE_ARRANGEMENT, false);
	}

	@Override
	public TiUIView createView(Activity activity)
	{
		return new TiUIStackView(this);
	}

	@Override
	public String getApiName()
	{
		return "Ti.UI.StackView";
	}

	/**
	 * Adds a view to the end of the arrangedSubviews array.
	 * @param args The view to add to the array of views arranged by the stack view.
	 */
	@Kroll.method
	public void addArrangedSubview(TiViewProxy viewProxy)
	{
		if (viewProxy == null) {
			return;
		}

		TiUIView view = getOrCreateView();
		if (view instanceof TiUIStackView) {
			((TiUIStackView) view).addArrangedSubview(viewProxy);
		}
	}

	/**
	 * Removes the provided view from the stack's array of arranged subviews.
	 * @param args The view to remove from the array of views arranged by the stack view.
	 */
	@Kroll.method
	public void removeArrangedSubview(TiViewProxy viewProxy)
	{
		if (viewProxy == null) {
			return;
		}

		TiUIView view = getView();
		if (view instanceof TiUIStackView) {
			((TiUIStackView) view).removeArrangedSubview(viewProxy);
		}
	}

	/**
	 * Inserts the provided view into the arrangedSubviews array at the specified index.
	 * @param viewProxy The view to insert into the array of views arranged by the stack view.
	 * @param index The index at which to insert the view.
	 */
	@Kroll.method
	public void insertArrangedSubview(TiViewProxy viewProxy, int index)
	{
		if (viewProxy == null) {
			return;
		}

		TiUIView view = getOrCreateView();
		if (view instanceof TiUIStackView) {
			((TiUIStackView) view).insertArrangedSubview(viewProxy, index);
		}
	}

	/**
	 * Applies the spacing only between the specified view and the view that follows it.
	 * @param spacing The spacing to apply after the specified view.
	 * @param afterViewProxy The view after which to apply the custom spacing.
	 */
	@Kroll.method
	public void setCustomSpacing(float spacing, TiViewProxy afterViewProxy)
	{
		if (afterViewProxy == null) {
			return;
		}

		TiUIView view = getView();
		if (view instanceof TiUIStackView) {
			((TiUIStackView) view).setCustomSpacing(spacing, afterViewProxy);
		}
	}

	// ✅ Animation control properties
	@Kroll.setProperty
	public void setAnimationsEnabled(boolean enabled)
	{
		TiUIStackView stackView = (TiUIStackView) getOrCreateView();
		stackView.setAnimationsEnabled(enabled);
	}

	@Kroll.getProperty
	public boolean getAnimationsEnabled()
	{
		// Default to true since animations are enabled by default
		return true;
	}

	@Kroll.setProperty
	public void setAnimationDuration(int durationMs)
	{
		TiUIStackView stackView = (TiUIStackView) getOrCreateView();
		stackView.setAnimationDuration(durationMs);
	}

	@Kroll.getProperty
	public int getAnimationDuration()
	{
		// Default animation duration
		return 300;
	}
}