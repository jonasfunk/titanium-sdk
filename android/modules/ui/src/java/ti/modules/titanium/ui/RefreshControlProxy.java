/**
 * Titanium SDK
 * Copyright TiDev, Inc. 04/07/2022-Present. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */
package ti.modules.titanium.ui;

import android.graphics.Color;

import org.appcelerator.kroll.KrollDict;
import org.appcelerator.kroll.KrollProxy;
import org.appcelerator.kroll.annotations.Kroll;
import org.appcelerator.kroll.common.Log;
import org.appcelerator.titanium.TiC;
import org.appcelerator.titanium.util.TiColorHelper;
import org.appcelerator.titanium.util.TiConvert;

import java.util.HashSet;

import ti.modules.titanium.ui.widget.TiSwipeRefreshLayout;

@Kroll.proxy(creatableInModule = UIModule.class,
	propertyAccessors = {
		TiC.PROPERTY_TINT_COLOR,
		TiC.PROPERTY_TITLE,
		TiC.PROPERTY_REFRESH_CONTROL_OFFSET
	})
public class RefreshControlProxy extends KrollProxy
{
	/**
	 * The default Android log tag name to be used by this class.
	 */
	private static final String TAG = "RefreshControlProxy";
	private static int offsetStart = -1;
	private static int offsetEnd = -1;
	/**
	 * Android's default progress indicator color used by the SwipeRefreshLayout class.
	 * This is defined in Google's "MaterialProgressDrawable.java", which is an internal class.
	 */
	private static final int DEFAULT_TINT_COLOR = Color.BLACK;

	/**
	 * Static collection storing all "RefreshControlProxy" instances currently assigned to a
	 * "TiSwipeRefreshLayout" view. Instances must be removed when this class' static
	 * unassignFrom() method has been called.
	 */
	private static final HashSet<RefreshControlProxy> assignedControls = new HashSet<>();

	/**
	 * Color integer value to be applied to the refresh layout's progress indicator.
	 */
	private int tintColor = DEFAULT_TINT_COLOR;

	/**
	 * Reference to the view this refresh control has been assigned to via the bindTo() method.
	 * Set to null if not currently assigned to a view.
	 */
	private TiSwipeRefreshLayout swipeRefreshLayout;

	/**
	 * Creates a new Titanium "RefreshControl" proxy binding.
	 */
	public RefreshControlProxy()
	{
		super();
	}

	/**
	 * Unassigns the given view from a RefreshControlProxy instance that was once assigned to
	 * it via the assignTo() method. A view is expected to call this method when removed from the
	 * window or to disable pull-down refresh support.
	 *
	 * @param view The view to be unassigned from a refresh control, if currently assigned. Can be null.
	 */
	public static void unassignFrom(TiSwipeRefreshLayout view)
	{
		// Validate argument.
		if (view == null) {
			return;
		}

		// Attempt to find a refresh control that is currently assigned to the given view.
		RefreshControlProxy proxy = null;
		for (RefreshControlProxy nextProxy : RefreshControlProxy.assignedControls) {
			if ((nextProxy != null) && (nextProxy.swipeRefreshLayout == view)) {
				proxy = nextProxy;
				break;
			}
		}
		if (proxy == null) {
			return;
		}

		// Remove the refresh event listener.
		proxy.swipeRefreshLayout.setOnRefreshListener(null);

		// Disable pull-down refresh support.
		proxy.endRefreshing();
		proxy.swipeRefreshLayout.setSwipeRefreshEnabled(false);

		// Unassign the view from the refresh control.
		RefreshControlProxy.assignedControls.remove(proxy);
		proxy.swipeRefreshLayout = null;
	}

	/**
	 * Fetches the JavaScript type name of this proxy object.
	 *
	 * @return Returns the unique type name of this proxy object.
	 */
	@Override
	public String getApiName()
	{
		return "Ti.UI.RefreshControl";
	}

	/**
	 * Initializes this proxy with the given dictionary of property settings.
	 * <p>
	 * Expected to be called on the runtime thread when the
	 * JavaScript Ti.UI.createRefreshControl() function has been invoked.
	 *
	 * @param properties Dictionary of property settings.
	 */
	@Override
	public void handleCreationDict(KrollDict properties)
	{
		Object value;

		// Validate argument.
		if (properties == null) {
			return;
		}

		// Let the base class handle it first. Will localize property value if needed.
		super.handleCreationDict(properties);

		// Fetch "tintColor" property, if provided.
		if (properties.containsKeyAndNotNull(TiC.PROPERTY_TINT_COLOR)) {
			value = properties.get(TiC.PROPERTY_TINT_COLOR);
			if (value != null) {
				onTintColorChanged(value);
			}
		}

		// Fetch "offset" property, if provided.
		if (properties.containsKeyAndNotNull(TiC.PROPERTY_REFRESH_CONTROL_OFFSET)) {
			value = properties.get(TiC.PROPERTY_REFRESH_CONTROL_OFFSET);
			if (value != null) {
				onOffsetChanged(value);
			}
		}
	}

	/**
	 * Called when a single property setting has been changed.
	 * Expected to be called on the JavaScript runtime thread.
	 *
	 * @param name  The unique name of the property that was changed.
	 * @param value The property new value. Can be null.
	 */
	@Override
	public void onPropertyChanged(String name, Object value)
	{
		// Validate.
		if (name == null) {
			return;
		}

		// Let the base class handle it first. Will localize property value if needed.
		super.onPropertyChanged(name, value);

		// Handle property change.
		if (name.equals(TiC.PROPERTY_TINT_COLOR)) {
			onTintColorChanged(value);
		} else if (name.equals(TiC.PROPERTY_REFRESH_CONTROL_OFFSET)) {
			onOffsetChanged(value);
		}
	}

	/**
	 * Stores the given tint color value to be applied to the refresh progress indicator.
	 *
	 * @param colorName The color value to be applied. Expected to be a string such as "red", "blue", "#00FF00", etc.
	 *                  Can be null, in which case, the progress indicator will revert back to its default color.
	 */
	private void onTintColorChanged(Object colorName)
	{
		// Fetch and store the new tint color value.
		if (colorName == null) {
			this.tintColor = RefreshControlProxy.DEFAULT_TINT_COLOR;
		} else if (colorName instanceof String) {
			this.tintColor = TiColorHelper.parseColor((String) colorName, getActivity());
		} else {
			Log.e(TAG, "Property '" + TiC.PROPERTY_TINT_COLOR + "' must be of type string.");
			return;
		}

		// Do not continue if a view has not been assigned to the refresh control yet.
		if (this.swipeRefreshLayout == null) {
			return;
		}

		// Apply the color to the refresh progress indicator.
		this.swipeRefreshLayout.setColorSchemeColors(tintColor);
	}

	/**
	 * Processes offset property changes and applies them to the SwipeRefreshLayout.
	 *
	 * @param offsetValue The offset value to be applied. Expected to be a KrollDict with "start" and "end" properties.
	 */
	private void onOffsetChanged(Object offsetValue)
	{
		// Validate offset value - accept KrollDict, HashMap, or other Map types
		if (offsetValue == null) {
			Log.e(TAG, "Property '" + TiC.PROPERTY_REFRESH_CONTROL_OFFSET + "' cannot be null.");
			return;
		}

		// Convert to KrollDict if needed
		KrollDict offset;
		if (offsetValue instanceof KrollDict) {
			offset = (KrollDict) offsetValue;
		} else if (offsetValue instanceof java.util.Map) {
			// Convert HashMap or other Map types to KrollDict
			offset = new KrollDict((java.util.Map<String, Object>) offsetValue);
		} else {
			String errorMsg = "Property '" + TiC.PROPERTY_REFRESH_CONTROL_OFFSET
				+ "' must have 'start' and 'end'. Received: " + offsetValue.getClass().getSimpleName();
			Log.e(TAG, errorMsg);
			return;
		}

		// Validate that required keys exist
		if (!offset.containsKey("start") || !offset.containsKey("end")) {
			String errorMsg = "Property '" + TiC.PROPERTY_REFRESH_CONTROL_OFFSET
				+ "' must contain both 'start' and 'end' properties.";
			Log.e(TAG, errorMsg);
			return;
		}

		// Get density factor for manual conversion from dp to pixels
		float density;
		if (this.swipeRefreshLayout != null) {
			density = this.swipeRefreshLayout.getResources().getDisplayMetrics().density;
		} else {
			density = getActivity().getResources().getDisplayMetrics().density;
		}

		// Calculate new offset values - convert dp to pixels manually
		// The values from JavaScript are expected to be in dp (density-independent pixels)
		int startDp = TiConvert.toInt(offset.get("start"), 0);
		int endDp = TiConvert.toInt(offset.get("end"), 80);
		
		int newOffsetStart = (int) (startDp * density);
		int newOffsetEnd = (int) (endDp * density);

		// Update static offset values
		offsetStart = newOffsetStart;
		offsetEnd = newOffsetEnd;

		if (this.swipeRefreshLayout != null) {
			this.swipeRefreshLayout.setProgressViewOffset(false, offsetStart, offsetEnd);
		}
	}

	/**
	 * Displays the refresh progress indicator if a SwipeRefreshLayout is currently assigned.
	 */
	@Kroll.method
	public void beginRefreshing()
	{
		// Do not continue if a refreshable view has not been assigned to this control.
		if (this.swipeRefreshLayout == null) {
			return;
		}

		// Do not continue if already refreshing.
		if (this.swipeRefreshLayout.isRefreshing()) {
			return;
		}

		// Show the refresh progress indicator.
		this.swipeRefreshLayout.setRefreshing(true);

		// Notify the owner that the refresh state has started.
		fireEvent(TiC.EVENT_REFRESH_START, null);
	}

	/**
	 * Hides the refresh progress indicator if a SwipeRefreshLayout is currently assigned.
	 */
	@Kroll.method
	public void endRefreshing()
	{
		// Do not continue if a refreshable view has not be assigned to this control.
		if (this.swipeRefreshLayout == null) {
			return;
		}

		// Do not continue if not refreshing.
		if (this.swipeRefreshLayout.isRefreshing() == false) {
			return;
		}

		// Hide the refresh progress indicator.
		this.swipeRefreshLayout.setRefreshing(false);

		// Notify the owner that the refresh state has ended.
		fireEvent(TiC.EVENT_REFRESH_END, null);
	}

	/**
	 * Assigns the given Android "TiSwipeRefreshLayout" to be controlled by this "RefreshControl" proxy.
	 * Once assigned, this object's JavaScript APIs can control the view's progress indicator.
	 * <p>
	 * The caller must call RefreshControlProxy.unassignFrom() to detach the given view from
	 * this refresh control once done with it or to disable pull-down refresh support.
	 * <p>
	 * If the given view was assigned to another refresh control, then it'll be automatically
	 * unassigned from it before being assigned to this refresh control.
	 * <p>
	 * If this refresh control is currently assigned to another view, then it will be automatically
	 * unassigned from the previous view before being assigned the given view.
	 *
	 * @param view The view to be assigned to this refresh control.
	 *             <p>
	 *             Can be null, in which case, this method will do nothing.
	 */
	public void assignTo(TiSwipeRefreshLayout view)
	{
		// Validate argument.
		if (view == null) {
			return;
		}

		// Do not continue if this proxy's view reference isn't changing.
		if (this.swipeRefreshLayout == view) {
			return;
		}

		// If the given view has been assigned to another refresh control, then unassign it now.
		RefreshControlProxy.unassignFrom(view);

		// Assign this refresh control to the given view.
		this.swipeRefreshLayout = view;
		RefreshControlProxy.assignedControls.add(this);

		// Set up the given view for pull-down refresh support.
		view.setColorSchemeColors(this.tintColor);
		
		// Apply offset if it has been set, or recompute it from properties
		if (offsetStart != -1 && offsetEnd != -1) {
			Log.d(TAG, "Applying existing offset to new view - start: " + offsetStart + "px, end: " + offsetEnd + "px");
			view.setProgressViewOffset(false, offsetStart, offsetEnd);
		} else {
			// Check if we have offset property values to recompute
			Object offsetProperty = getProperty(TiC.PROPERTY_REFRESH_CONTROL_OFFSET);
			if (offsetProperty != null) {
				Log.d(TAG, "Recomputing offset for new view assignment");
				onOffsetChanged(offsetProperty);
			}
		}
		
		view.setSwipeRefreshEnabled(true);
		view.setOnRefreshListener(new TiSwipeRefreshLayout.OnRefreshListener()
		{
			@Override
			public void onRefresh()
			{
				// The refresh progress indicator has been shown on-screen.
				// Notify the owner. This is the owner's chance to load something.
				fireEvent(TiC.EVENT_REFRESH_START, null);
			}
		});
	}
}
